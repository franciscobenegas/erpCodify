"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, cookieOpts, firmarSesion } from "@/lib/session";
import { getSession } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import type { ActionState } from "@/lib/action";

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/tablero");

  const user = await prisma.usuario.findUnique({ where: { email }, include: { rol: true, empresa: true } });
  if (!user || !user.activo || !(await bcrypt.compare(password, user.passwordHash))) {
    await auditar({ modulo: "seguridad", entidad: "Usuario", entidadId: user?.id ?? null, accion: "LOGIN", resumen: `Intento de inicio de sesión fallido (${email})`, usuario: { id: user?.id ?? null, nombre: user?.nombre ?? email } });
    return { error: "Email o contraseña incorrectos" };
  }
  if (!user.empresa.activo) {
    await auditar({ modulo: "seguridad", entidad: "Usuario", entidadId: user.id, accion: "LOGIN", resumen: `Inicio bloqueado: la empresa está inactiva`, usuario: { id: user.id, nombre: user.nombre } });
    return { error: "La empresa está inactiva. Contactá al administrador." };
  }

  const token = await firmarSesion({
    userId: user.id,
    empresaId: user.empresaId,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol.nombre,
    permisos: user.rol.permisos,
    esSuperAdmin: user.esSuperAdmin,
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOpts);
  await auditar({ modulo: "seguridad", entidad: "Usuario", entidadId: user.id, accion: "LOGIN", resumen: `Inició sesión`, usuario: { id: user.id, nombre: user.nombre } });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/tablero");
}

export async function logout() {
  const s = await getSession();
  if (s) await auditar({ modulo: "seguridad", entidad: "Usuario", entidadId: s.userId, accion: "LOGOUT", resumen: `Cerró sesión`, usuario: { id: s.userId, nombre: s.nombre } });
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
