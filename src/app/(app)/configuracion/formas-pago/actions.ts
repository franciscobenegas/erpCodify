"use server";

import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, mensajeError, type ActionState } from "@/lib/action";

export async function crearFormaPago(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    const despues = await db.formaPago.create({ data: { nombre, empresaId: s.empresaId } });
    await auditar({ modulo: "configuracion", entidad: "FormaPago", entidadId: despues.id, accion: "CREAR", resumen: `Creó la forma de pago "${nombre}"`, despues });
    revalidatePath("/configuracion/formas-pago");
    return { ok: `Forma de pago "${nombre}" creada` };
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
