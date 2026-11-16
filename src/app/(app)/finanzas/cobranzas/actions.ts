"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { moverCaja } from "@/lib/caja";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zNum, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const cobroSchema = z.object({
  clienteId: z.coerce.number().int().positive("elegí un cliente"),
  monto: zNum.positive("debe ser mayor a 0"),
  cuentaId: z.coerce.number().int().positive("elegí una cuenta"),
  medio: zOptStr,
  nota: zOptStr,
});

/** Registra un cobro de un cliente: lo aplica FIFO a sus facturas a crédito e ingresa el dinero a la caja. */
export async function registrarCobro(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("finanzas");
    const p = cobroSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { clienteId, monto, cuentaId, medio, nota } = p.data;

    const [cliente, cuenta] = await Promise.all([
      db.contacto.findUnique({ where: { id: clienteId }, select: { id: true, nombre: true } }),
      db.cuentaFinanciera.findUnique({ where: { id: cuentaId }, select: { id: true } }),
    ]);
    if (!cliente) throw new ErrorNegocio("Cliente inválido");
    if (!cuenta) throw new ErrorNegocio("Cuenta inválida");

    const cobroId = await db.$transaction(async (tx) => {
      // Facturas a crédito emitidas del cliente, con lo ya aplicado (FIFO por fecha).
      const facturas = await tx.factura.findMany({
        where: { clienteId, condicion: "CREDITO", estado: "EMITIDA" },
        include: { cobroAplicaciones: { select: { monto: true } } },
        orderBy: { fecha: "asc" },
      });
      const pendientes = facturas
        .map((f) => ({ id: f.id, saldo: Number(f.total) - f.cobroAplicaciones.reduce((a, x) => a + Number(x.monto), 0) }))
        .filter((f) => f.saldo > 0.5);
      const totalPendiente = pendientes.reduce((a, f) => a + f.saldo, 0);

      if (totalPendiente <= 0) throw new ErrorNegocio("El cliente no tiene facturas a crédito pendientes.");
      if (monto > totalPendiente + 0.5) throw new ErrorNegocio(`El monto supera la deuda del cliente (pendiente: ${Math.round(totalPendiente)}).`);

      const cobro = await tx.cobro.create({
        data: { empresaId: s.empresaId, clienteId, monto, cuentaId, medio: medio ?? null, nota: nota ?? null, usuarioId: s.userId },
      });

      let restante = monto;
      for (const f of pendientes) {
        if (restante <= 0.5) break;
        const aplicar = Math.min(restante, f.saldo);
        await tx.cobroAplicacion.create({ data: { cobroId: cobro.id, facturaId: f.id, monto: aplicar } });
        restante -= aplicar;
      }

      await moverCaja(tx, {
        empresaId: s.empresaId,
        cuentaId,
        tipo: "INGRESO",
        monto,
        concepto: `Cobro de ${cliente.nombre}`,
        origen: "COBRO",
        referencia: `Cobro #${cobro.id}`,
        usuarioId: s.userId,
      });

      return cobro.id;
    });

    await auditar({
      modulo: "finanzas",
      entidad: "Cobro",
      entidadId: cobroId,
      accion: "CREAR",
      resumen: `Registró un cobro de ${Math.round(monto)} de ${cliente.nombre}`,
      despues: { clienteId, monto, cuentaId, medio, nota },
    });

    revalidatePath("/finanzas/cobranzas");
    revalidatePath("/finanzas/caja");
    return { ok: `Cobro de ${cliente.nombre} registrado` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
