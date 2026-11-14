"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenant, getSession } from "@/lib/auth";
import { consultarRuc, type RucLookup } from "@/lib/ruc";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const schema = z.object({
  id: z.coerce.number().int().optional(),
  tipo: z.enum(["cliente", "proveedor"]),
  nombre: z.string().trim().min(2, "requerido"),
  ruc: zOptStr.refine((v) => !v || /^\d{3,8}-\d$/.test(v), "formato 1234567-8"),
  telefono: zOptStr,
  email: zOptStr,
  direccion: zOptStr,
  esCliente: z.string().optional().transform((v) => v === "on"),
  esProveedor: z.string().optional().transform((v) => v === "on"),
  activo: z.string().optional().transform((v) => v === "on"),
});

export async function guardarContacto(_: ActionState, fd: FormData): Promise<ActionState> {
  const tipo = fd.get("tipo") === "proveedor" ? "proveedor" : "cliente";
  const base = tipo === "cliente" ? "/ventas/clientes" : "/compras/proveedores";
  const modulo = tipo === "cliente" ? "ventas" : "compras";
  try {
    const { s, db } = await getTenant(modulo);
    const p = schema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { id, tipo: _t, ...data } = p.data;
    // El contacto siempre mantiene el rol desde donde se edita
    if (tipo === "cliente") data.esCliente = true;
    else data.esProveedor = true;

    const antes = id ? await db.contacto.findUnique({ where: { id } }) : null;
    const despues = id ? await db.contacto.update({ where: { id }, data }) : await db.contacto.create({ data: { ...data, empresaId: s.empresaId } });
    await auditar({ modulo, entidad: "Contacto", entidadId: despues.id, accion: id ? "EDITAR" : "CREAR", resumen: `${id ? "Editó" : "Creó"} el ${tipo} ${despues.nombre}`, antes, despues });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(base);
  redirect(base);
}

/** Consulta datos de un contribuyente por RUC (para autocompletar el alta). */
export async function lookupRuc(ruc: string): Promise<RucLookup> {
  const s = await getSession();
  if (!s || !s.permisos.includes("ventas")) return { ok: false, error: "Sin permiso." };
  return consultarRuc(ruc);
}

export async function eliminarContacto(
  id: number,
  tipo: "cliente" | "proveedor",
  _: ActionState,
): Promise<ActionState> {
  const base = tipo === "cliente" ? "/ventas/clientes" : "/compras/proveedores";
  const modulo = tipo === "cliente" ? "ventas" : "compras";
  try {
    const { db } = await getTenant(modulo);
    const antes = await db.contacto.findUnique({
      where: { id },
      include: { _count: { select: { facturas: true, ordenes: true } } },
    });
    if (!antes) throw new ErrorNegocio("El contacto no existe.");
    if (antes._count.facturas > 0 || antes._count.ordenes > 0)
      throw new ErrorNegocio("No se puede eliminar: tiene comprobantes asociados. Desactivalo en su lugar.");

    await db.contacto.delete({ where: { id } });
    await auditar({ modulo, entidad: "Contacto", entidadId: id, accion: "ELIMINAR", resumen: `Eliminó el ${tipo} ${antes.nombre}`, antes });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(base);
  redirect(base);
}

export type ClienteCreado = { error?: string; cliente?: { id: number; label: string } };

/** Alta rápida de cliente desde un combo (no redirige; devuelve el cliente creado). */
export async function crearClienteRapido(_: ClienteCreado, fd: FormData): Promise<ClienteCreado> {
  try {
    const { s, db } = await getTenant("ventas");
    const altaSchema = schema.pick({ nombre: true, ruc: true, telefono: true, email: true, direccion: true });
    const p = altaSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };

    const cliente = await db.contacto.create({ data: { ...p.data, esCliente: true, activo: true, empresaId: s.empresaId } });
    await auditar({ modulo: "ventas", entidad: "Contacto", entidadId: cliente.id, accion: "CREAR", resumen: `Creó el cliente ${cliente.nombre}`, antes: null, despues: cliente });

    revalidatePath("/ventas/clientes");
    return { cliente: { id: cliente.id, label: `${cliente.nombre}${cliente.ruc ? ` — ${cliente.ruc}` : ""}` } };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
