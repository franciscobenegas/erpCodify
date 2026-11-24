"use server";

import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, mensajeError, type ActionState } from "@/lib/action";

export async function crearMarca(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    const despues = await db.marca.create({ data: { nombre, empresaId: s.empresaId } });
    await auditar({ modulo: "configuracion", entidad: "Marca", entidadId: despues.id, accion: "CREAR", resumen: `Creó la marca "${nombre}"`, despues });
    revalidatePath("/configuracion/marcas");
    return { ok: `Marca "${nombre}" creada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function crearModelo(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const nombre = String(fd.get("nombre") ?? "").trim();
    const marcaId = fd.get("marcaId") ? Number(fd.get("marcaId")) : null;
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    // La marca referenciada debe ser de esta empresa (el id viene del formulario).
    if (marcaId != null && !(await db.marca.findUnique({ where: { id: marcaId }, select: { id: true } }))) {
      throw new ErrorNegocio("Marca inválida");
    }
    const despues = await db.modeloProducto.create({ data: { nombre, marcaId, empresaId: s.empresaId } });
    await auditar({ modulo: "configuracion", entidad: "ModeloProducto", entidadId: despues.id, accion: "CREAR", resumen: `Creó el modelo "${nombre}"`, despues });
    revalidatePath("/configuracion/marcas");
    return { ok: `Modelo "${nombre}" creado` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
