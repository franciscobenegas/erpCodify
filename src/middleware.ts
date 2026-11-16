import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verificarSesion } from "@/lib/session";
import { moduloDeRuta } from "@/lib/permisos";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sesion = await verificarSesion(req.cookies.get(SESSION_COOKIE)?.value);

  // Landing pública en la raíz (accesible con o sin sesión).
  if (pathname === "/") return NextResponse.next();

  // Páginas de autenticación públicas: si ya hay sesión, va directo al panel.
  if (pathname === "/login" || pathname === "/registro") {
    return sesion ? NextResponse.redirect(new URL("/tablero", req.url)) : NextResponse.next();
  }

  if (!sesion) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Área de plataforma: solo administradores de plataforma (super-admins).
  if (pathname.startsWith("/plataforma") && !sesion.esSuperAdmin) {
    return NextResponse.redirect(new URL("/tablero?sinPermiso=1", req.url));
  }

  const modulo = moduloDeRuta(pathname.replace(/^\/api/, ""));
  if (modulo && !sesion.permisos.includes(modulo)) {
    return NextResponse.redirect(new URL("/tablero?sinPermiso=1", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
