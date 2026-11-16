"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { moverCaja } from "@/lib/caja";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zNum, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const pagoSchema = z.object({
  proveedorId: z.coerce.number().int().positive("elegí un proveedor"),
  monto: zNum.positive("debe ser mayor a 0"),
  cuentaId: z.coerce.number().int().positive("elegí una cuenta"),
  medio: zOptStr,
  nota: zOptStr,
});

/** Registra un pago a un proveedor: lo aplica FIFO a sus órdenes recibidas y egresa el dinero de la caja. */
export async function registrarPago(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("finanzas");
    const p = pagoSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { proveedorId, monto, cuentaId, medio, nota } = p.data;

    const [proveedor, cuenta] = await Promise.all([
      db.contacto.findUnique({ where: { id: proveedorId }, select: { id: true, nombre: true } }),
      db.cuentaFinanciera.findUnique({ where: { id: cuentaId }, select: { id: true } }),
    ]);
    if (!proveedor) throw new ErrorNegocio("Proveedor inválido");
    if (!cuenta) throw new ErrorNegocio("Cuenta inválida");

    const pagoId = await db.$transaction(async (tx) => {
      // Órdenes recibidas del proveedor, con lo ya pagado (FIFO por fecha).
      const ordenes = await tx.ordenCompra.findMany({
        where: { proveedorId, estado: "RECIBIDA" },
        include: { pagoAplicaciones: { select: { monto: true } } },
        orderBy: { fecha: "asc" },
      });
      const pendientes = ordenes
        .map((o) => ({ id: o.id, saldo: Number(o.total) - o.pagoAplicaciones.reduce((a, x) => a + Number(x.monto), 0) }))
        .filter((o) => o.saldo > 0.5);
      const totalPendiente = pendientes.reduce((a, o) => a + o.saldo, 0);

      if (totalPendiente <= 0) throw new ErrorNegocio("El proveedor no tiene órdenes recibidas pendientes.");
      if (monto > totalPendiente + 0.5) throw new ErrorNegocio(`El monto supera la deuda con el proveedor (pendiente: ${Math.round(totalPendiente)}).`);

      const pago = await tx.pago.create({
        data: { empresaId: s.empresaId, proveedorId, monto, cuentaId, medio: medio ?? null, nota: nota ?? null, usuarioId: s.userId },
      });

      let restante = monto;
      for (const o of pendientes) {
        if (restante <= 0.5) break;
        const aplicar = Math.min(restante, o.saldo);
        await tx.pagoAplicacion.create({ data: { pagoId: pago.id, ordenId: o.id, monto: aplicar } });
        restante -= aplicar;
      }

      await moverCaja(tx, {
        empresaId: s.empresaId,
        cuentaId,
        tipo: "EGRESO",
        monto,
        concepto: `Pago a ${proveedor.nombre}`,
        origen: "PAGO",
        referencia: `Pago #${pago.id}`,
        usuarioId: s.userId,
      });

      return pago.id;
    });

    await auditar({
      modulo: "finanzas",
      entidad: "Pago",
      entidadId: pagoId,
      accion: "CREAR",
      resumen: `Registró un pago de ${Math.round(monto)} a ${proveedor.nombre}`,
      despues: { proveedorId, monto, cuentaId, medio, nota },
    });

    revalidatePath("/finanzas/pagos");
    revalidatePath("/finanzas/caja");
    return { ok: `Pago a ${proveedor.nombre} registrado` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
