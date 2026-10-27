"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/auth";
import { formObj, mensajeError, zodMsg, zOptStr, type ActionState } from "@/lib/action";

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
  try {
    await requirePermiso(tipo === "cliente" ? "ventas" : "compras");
    const p = schema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { id, tipo: _t, ...data } = p.data;
    // El contacto siempre mantiene el rol desde donde se edita
    if (tipo === "cliente") data.esCliente = true;
    else data.esProveedor = true;

    if (id) await prisma.contacto.update({ where: { id }, data });
    else await prisma.contacto.create({ data });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(base);
  redirect(base);
}
