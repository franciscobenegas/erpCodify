"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const sucursalSchema = z.object({
  nombre: z.string().trim().min(2, "requerido"),
  establecimiento: z.string().regex(/^\d{3}$/, "3 dígitos"),
  direccion: zOptStr,
});

export async function crearSucursal(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const p = sucursalSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const despues = await db.sucursal.create({ data: { empresaId: s.empresaId, ...p.data } });
    await auditar({ modulo: "configuracion", entidad: "Sucursal", entidadId: despues.id, accion: "CREAR", resumen: `Creó la sucursal "${p.data.nombre}"`, despues });
    revalidatePath("/configuracion/puntos-venta");
    return { ok: `Sucursal "${p.data.nombre}" creada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function toggleSucursal(id: number, _: ActionState): Promise<ActionState> {
  try {
    const { db } = await getTenant("configuracion");
    const actual = await db.sucursal.findUnique({ where: { id } });
    if (!actual) throw new ErrorNegocio("Sucursal inválida");
    const despues = await db.sucursal.update({ where: { id }, data: { activo: !actual.activo } });
    await auditar({ modulo: "configuracion", entidad: "Sucursal", entidadId: id, accion: "EDITAR", resumen: `${despues.activo ? "Activó" : "Desactivó"} la sucursal "${despues.nombre}"`, antes: actual, despues });
    revalidatePath("/configuracion/puntos-venta");
    return {};
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

const puntoSchema = z.object({
  nombre: z.string().trim().min(2, "requerido"),
  sucursalId: z.coerce.number().int().positive("elegí una sucursal"),
  puntoExpedicion: z.string().regex(/^\d{3}$/, "3 dígitos"),
});

export async function crearPuntoVenta(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const p = puntoSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const suc = await db.sucursal.findUnique({ where: { id: p.data.sucursalId }, select: { id: true } });
    if (!suc) throw new ErrorNegocio("Sucursal inválida");
    const despues = await db.puntoVenta.create({ data: { empresaId: s.empresaId, ...p.data } });
    await auditar({ modulo: "configuracion", entidad: "PuntoVenta", entidadId: despues.id, accion: "CREAR", resumen: `Creó el punto de venta "${p.data.nombre}"`, despues });
    revalidatePath("/configuracion/puntos-venta");
    return { ok: `Punto de venta "${p.data.nombre}" creado` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function togglePuntoVenta(id: number, _: ActionState): Promise<ActionState> {
  try {
    const { db } = await getTenant("configuracion");
    const actual = await db.puntoVenta.findUnique({ where: { id } });
    if (!actual) throw new ErrorNegocio("Punto de venta inválido");
    const despues = await db.puntoVenta.update({ where: { id }, data: { activo: !actual.activo } });
    await auditar({ modulo: "configuracion", entidad: "PuntoVenta", entidadId: id, accion: "EDITAR", resumen: `${despues.activo ? "Activó" : "Desactivó"} el punto de venta "${despues.nombre}"`, antes: actual, despues });
    revalidatePath("/configuracion/puntos-venta");
    return {};
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
