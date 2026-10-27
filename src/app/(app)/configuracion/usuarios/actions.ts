"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/auth";
import { MODULOS } from "@/lib/permisos";
import { ErrorNegocio, formObj, mensajeError, zodMsg, type ActionState } from "@/lib/action";

const usuarioSchema = z.object({
  id: z.coerce.number().int().optional(),
  nombre: z.string().trim().min(2, "requerido"),
  email: z.string().trim().toLowerCase().email("email inválido"),
  rolId: z.coerce.number().int().positive("elegí un rol"),
  activo: z.string().optional().transform((v) => v === "on"),
  password: z.string().optional(),
});

export async function guardarUsuario(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requirePermiso("configuracion");
    const p = usuarioSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { id, password, ...data } = p.data;

    if (password && password.length < 6) throw new ErrorNegocio("La contraseña debe tener al menos 6 caracteres");
    if (id === s.userId && !data.activo) throw new ErrorNegocio("No podés desactivar tu propio usuario");

    if (id) {
      await prisma.usuario.update({
        where: { id },
        data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
      });
    } else {
      if (!password) throw new ErrorNegocio("Ingresá una contraseña para el nuevo usuario");
      await prisma.usuario.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
    }
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/configuracion/usuarios");
  redirect("/configuracion/usuarios");
}

const validos = new Set<string>(MODULOS.map((m) => m.key));

export async function guardarRol(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requirePermiso("configuracion");
    const id = Number(fd.get("id") || 0);
    const nombre = String(fd.get("nombre") ?? "").trim();
    const permisos = fd.getAll("permisos").map(String).filter((p) => validos.has(p));
    if (nombre.length < 2) throw new ErrorNegocio("El rol necesita un nombre");

    if (id) await prisma.rol.update({ where: { id }, data: { nombre, permisos } });
    else await prisma.rol.create({ data: { nombre, permisos } });

    revalidatePath("/configuracion/usuarios");
    return { ok: "Rol guardado. Los usuarios verán el cambio al volver a ingresar." };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
