"use server";

import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, mensajeError, type ActionState } from "@/lib/action";

/** Valida que una cuenta (opcional) pertenezca a la empresa; devuelve el id o null. */
async function cuentaValida(db: Awaited<ReturnType<typeof getTenant>>["db"], raw: FormDataEntryValue | null) {
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n <= 0) return null;
  const c = await db.cuentaFinanciera.findUnique({ where: { id: n }, select: { id: true } });
  if (!c) throw new ErrorNegocio("Cuenta destino inválida");
  return c.id;
}

export async function crearFormaPago(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    const cuentaId = await cuentaValida(db, fd.get("cuentaId"));
    const despues = await db.formaPago.create({ data: { nombre, cuentaId, empresaId: s.empresaId } });
    await auditar({ modulo: "configuracion", entidad: "FormaPago", entidadId: despues.id, accion: "CREAR", resumen: `Creó la forma de pago "${nombre}"`, despues });
    revalidatePath("/configuracion/formas-pago");
    return { ok: `Forma de pago "${nombre}" creada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

/** Cambia la cuenta destino de una forma de pago (puede quedar sin cuenta). */
export async function setCuentaFormaPago(id: number, cuentaRaw: number | null): Promise<ActionState> {
  try {
    const { db } = await getTenant("configuracion");
    const antes = await db.formaPago.findUnique({ where: { id } });
    if (!antes) throw new ErrorNegocio("Forma de pago inválida");
    const cuentaId = await cuentaValida(db, cuentaRaw == null ? null : String(cuentaRaw));
    const despues = await db.formaPago.update({ where: { id }, data: { cuentaId } });
    await auditar({ modulo: "configuracion", entidad: "FormaPago", entidadId: id, accion: "EDITAR", resumen: `Cambió la cuenta destino de "${despues.nombre}"`, antes, despues });
    revalidatePath("/configuracion/formas-pago");
    return { ok: `Cuenta destino actualizada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function alternarFormaPago(id: number, _: ActionState, __: FormData): Promise<ActionState> {
  try {
    const { db } = await getTenant("configuracion");
    const actual = await db.formaPago.findUnique({ where: { id } });
    if (!actual) throw new ErrorNegocio("Forma de pago inválida");
    const despues = await db.formaPago.update({ where: { id }, data: { activo: !actual.activo } });
    await auditar({ modulo: "configuracion", entidad: "FormaPago", entidadId: id, accion: "EDITAR", resumen: `${despues.activo ? "Activó" : "Desactivó"} la forma de pago "${despues.nombre}"`, antes: actual, despues });
    revalidatePath("/configuracion/formas-pago");
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
