"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { moverCaja } from "@/lib/caja";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zNum, zodMsg, zOptStr, type ActionState } from "@/lib/action";

// ───────── Cuentas ─────────

const cuentaSchema = z.object({
  nombre: z.string().trim().min(2, "requerido"),
  tipo: z.enum(["CAJA", "BANCO"]),
  saldoInicial: zNum.min(0),
});

export async function crearCuenta(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("finanzas");
    const p = cuentaSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { nombre, tipo, saldoInicial } = p.data;

    const cuenta = await db.cuentaFinanciera.create({
      data: { empresaId: s.empresaId, nombre, tipo, saldoInicial, saldo: saldoInicial },
    });
    await auditar({ modulo: "finanzas", entidad: "CuentaFinanciera", entidadId: cuenta.id, accion: "CREAR", resumen: `Creó la cuenta "${nombre}" (${tipo})`, despues: cuenta });

    revalidatePath("/finanzas/caja");
    return { ok: `Cuenta "${nombre}" creada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

// ───────── Movimientos manuales ─────────

const movSchema = z.object({
  cuentaId: z.coerce.number().int().positive("elegí una cuenta"),
  tipo: z.enum(["INGRESO", "EGRESO"]),
  monto: zNum.positive("debe ser mayor a 0"),
  concepto: z.string().trim().min(2, "describí el movimiento"),
  nota: zOptStr,
});

export async function registrarMovimiento(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("finanzas");
    const p = movSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { cuentaId, tipo, monto, concepto, nota } = p.data;

    const cuenta = await db.cuentaFinanciera.findUnique({ where: { id: cuentaId }, select: { id: true, nombre: true } });
    if (!cuenta) throw new ErrorNegocio("Cuenta inválida");

    await db.$transaction(async (tx) => {
      await moverCaja(tx, {
        empresaId: s.empresaId,
        cuentaId,
        tipo,
        monto,
        concepto,
        origen: tipo === "INGRESO" ? "INGRESO" : "GASTO",
        referencia: nota,
        usuarioId: s.userId,
      });
    });

    await auditar({
      modulo: "finanzas",
      entidad: "MovimientoCaja",
      entidadId: `${cuentaId}`,
      accion: "AJUSTE",
      resumen: `${tipo === "INGRESO" ? "Ingreso" : "Egreso"} en "${cuenta.nombre}": ${concepto} (${monto})`,
      despues: { cuentaId, tipo, monto, concepto, nota },
    });

    revalidatePath("/finanzas/caja");
    return { ok: `${tipo === "INGRESO" ? "Ingreso" : "Egreso"} registrado` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

// ───────── Transferencia entre cuentas ─────────

const transferSchema = z.object({
  origenId: z.coerce.number().int().positive("elegí la cuenta origen"),
  destinoId: z.coerce.number().int().positive("elegí la cuenta destino"),
  monto: zNum.positive("debe ser mayor a 0"),
  nota: zOptStr,
});

export async function transferir(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("finanzas");
    const p = transferSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { origenId, destinoId, monto, nota } = p.data;
    if (origenId === destinoId) throw new ErrorNegocio("El origen y el destino deben ser distintos");

    const [origen, destino] = await Promise.all([
      db.cuentaFinanciera.findUnique({ where: { id: origenId }, select: { nombre: true } }),
      db.cuentaFinanciera.findUnique({ where: { id: destinoId }, select: { nombre: true } }),
    ]);
    if (!origen || !destino) throw new ErrorNegocio("Cuenta inválida");

    const ref = nota || `Transferencia ${origen.nombre} → ${destino.nombre}`;
    await db.$transaction(async (tx) => {
      await moverCaja(tx, { empresaId: s.empresaId, cuentaId: origenId, tipo: "EGRESO", monto, concepto: `Transferencia a ${destino.nombre}`, origen: "TRANSFERENCIA", referencia: ref, usuarioId: s.userId });
      await moverCaja(tx, { empresaId: s.empresaId, cuentaId: destinoId, tipo: "INGRESO", monto, concepto: `Transferencia de ${origen.nombre}`, origen: "TRANSFERENCIA", referencia: ref, usuarioId: s.userId });
    });

    await auditar({ modulo: "finanzas", entidad: "MovimientoCaja", entidadId: `${origenId}-${destinoId}`, accion: "TRANSFERENCIA", resumen: `Transfirió ${monto} de "${origen.nombre}" a "${destino.nombre}"`, despues: { origenId, destinoId, monto, nota } });

    revalidatePath("/finanzas/caja");
    return { ok: "Transferencia registrada" };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
