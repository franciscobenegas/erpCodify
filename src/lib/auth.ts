import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verificarSesion, type SessionPayload } from "./session";
import { tenantDb } from "./tenant-db";
import type { Modulo } from "./permisos";

export async function getSession() {
  const store = await cookies();
  return verificarSesion(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** Usar al inicio de cada server action: valida sesión y permiso del módulo. */
export async function requirePermiso(modulo: Modulo): Promise<SessionPayload> {
  const s = await requireSession();
  if (!s.permisos.includes(modulo)) throw new Error("No tenés permiso para esta operación");
  return s;
}

/** Valida que el usuario sea administrador de plataforma (gestión de empresas). */
export async function requireSuperAdmin(): Promise<SessionPayload> {
  const s = await requireSession();
  if (!s.esSuperAdmin) redirect("/");
  return s;
}

/**
 * Devuelve la sesión y un cliente Prisma ya scopeado a la empresa del usuario.
 * Usar en server actions y server components en lugar del `prisma` crudo.
 *   const { s, db } = await getTenant("ventas");  // valida permiso del módulo
 *   const { s, db } = await getTenant();            // solo valida sesión
 */
export async function getTenant(modulo?: Modulo) {
  const s = modulo ? await requirePermiso(modulo) : await requireSession();
  return { s, db: tenantDb(s.empresaId) };
}
