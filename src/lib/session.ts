// Sesión firmada con JWT (jose). Funciona en el middleware (edge) y en el servidor.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "erp_session";
const DURACION_SEG = 60 * 60 * 12; // 12 horas

export type SessionPayload = {
  userId: number;
  nombre: string;
  email: string;
  rol: string;
  permisos: string[];
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Falta AUTH_SECRET en .env");
  return new TextEncoder().encode(s);
}

export async function firmarSesion(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEG}s`)
    .sign(secret());
}

export async function verificarSesion(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  // En producción con HTTPS debe ser true. Poner AUTH_COOKIE_SECURE=false si se usa por HTTP en red local.
  secure: process.env.AUTH_COOKIE_SECURE ? process.env.AUTH_COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DURACION_SEG,
};
