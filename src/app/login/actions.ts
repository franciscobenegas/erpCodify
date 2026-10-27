"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, cookieOpts, firmarSesion } from "@/lib/session";
import type { ActionState } from "@/lib/action";

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/");

  const user = await prisma.usuario.findUnique({ where: { email }, include: { rol: true } });
  if (!user || !user.activo || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Email o contraseña incorrectos" };
  }

  const token = await firmarSesion({
    userId: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol.nombre,
    permisos: user.rol.permisos,
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOpts);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
