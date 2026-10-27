import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const gs = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });
const qty = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 3 });
// Zona horaria de la empresa: el servidor puede correr en UTC (Docker, Vercel, etc.)
export const APP_TZ = "America/Asuncion";
const fecha = new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: APP_TZ });
// Para columnas @db.Date (sin hora), que Prisma devuelve como medianoche UTC
const fechaPura = new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const isoLocal = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ });

type Num = number | string | { toString(): string } | null | undefined;

export const toNum = (v: Num) => (v == null ? 0 : Number(v.toString()));
export const formatGs = (v: Num) => `Gs. ${gs.format(toNum(v))}`;
export const formatQty = (v: Num) => qty.format(toNum(v));
export const formatFecha = (d: Date | string) => fecha.format(new Date(d));
export const formatFechaPura = (d: Date | string) => fechaPura.format(new Date(d));
/** "2026-10-27" según la fecha de hoy en Paraguay */
export const hoyISO = () => isoLocal.format(new Date());
