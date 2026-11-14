"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenant } from "@/lib/auth";
import { MODULOS } from "@/lib/permisos";
import { auditar, sinSecretos } from "@/lib/auditoria";
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
    const { s, db } = await getTenant("configuracion");
    const p = usuarioSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { id, password, ...data } = p.data;

    if (password && password.length < 6) throw new ErrorNegocio("La contraseña debe tener al menos 6 caracteres");
    if (id === s.userId && !data.activo) throw new ErrorNegocio("No podés desactivar tu propio usuario");
    // El rol asignado debe ser de esta empresa (el id viene del formulario).
    if (!(await db.rol.findUnique({ where: { id: data.rolId }, select: { id: true } }))) {
      throw new ErrorNegocio("Rol inválido");
    }

    if (id) {
      const antes = await db.usuario.findUnique({ where: { id } });
      const despues = await db.usuario.update({
        where: { id },
        data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
      });
      await auditar({
        modulo: "configuracion",
        entidad: "Usuario",
        entidadId: id,
        accion: "EDITAR",
        resumen: `Editó el usuario ${despues.nombre} (${despues.email})${password ? " · cambió la contraseña" : ""}`,
        antes: sinSecretos(antes),
        despues: sinSecretos(despues),
      });
    } else {
      if (!password) throw new ErrorNegocio("Ingresá una contraseña para el nuevo usuario");
      const despues = await db.usuario.create({ data: { ...data, empresaId: s.empresaId, passwordHash: await bcrypt.hash(password, 10) } });
      await auditar({ modulo: "configuracion", entidad: "Usuario", entidadId: despues.id, accion: "CREAR", resumen: `Creó el usuario ${despues.nombre} (${despues.email})`, despues: sinSecretos(despues) });
    }
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/configuracion/usuarios");
  redirect("/configuracion/usuarios");
}

export async function eliminarUsuario(id: number, _: ActionState): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    if (id === s.userId) throw new ErrorNegocio("No podés eliminar tu propio usuario.");

    const antes = await db.usuario.findUnique({
      where: { id },
      include: { _count: { select: { facturas: true, ordenes: true, movimientos: true } } },
    });
    if (!antes) throw new ErrorNegocio("El usuario no existe.");
    if (antes._count.facturas > 0 || antes._count.ordenes > 0 || antes._count.movimientos > 0)
      throw new ErrorNegocio("No se puede eliminar: tiene comprobantes o movimientos asociados. Desactivalo en su lugar.");

    await db.usuario.delete({ where: { id } });
    await auditar({
      modulo: "configuracion",
      entidad: "Usuario",
      entidadId: id,
      accion: "ELIMINAR",
      resumen: `Eliminó el usuario ${antes.nombre} (${antes.email})`,
      antes: sinSecretos(antes),
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/configuracion/usuarios");
  redirect("/configuracion/usuarios");
}

const validos = new Set<string>(MODULOS.map((m) => m.key));

export async function guardarRol(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const id = Number(fd.get("id") || 0);
    const nombre = String(fd.get("nombre") ?? "").trim();
    const permisos = fd.getAll("permisos").map(String).filter((p) => validos.has(p));
    if (nombre.length < 2) throw new ErrorNegocio("El rol necesita un nombre");

    const antes = id ? await db.rol.findUnique({ where: { id } }) : null;
    const despues = id
      ? await db.rol.update({ where: { id }, data: { nombre, permisos } })
      : await db.rol.create({ data: { nombre, permisos, empresaId: s.empresaId } });
    await auditar({ modulo: "configuracion", entidad: "Rol", entidadId: despues.id, accion: id ? "EDITAR" : "CREAR", resumen: `${id ? "Editó" : "Creó"} el rol "${nombre}"`, antes, despues });

    revalidatePath("/configuracion/usuarios");
    return { ok: "Rol guardado. Los usuarios verán el cambio al volver a ingresar." };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
