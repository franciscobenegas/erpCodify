import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verificarSesion, type SessionPayload } from "./session";
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
