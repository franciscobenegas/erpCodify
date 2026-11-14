import "server-only";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getSession } from "./auth";
import type { Modulo } from "./permisos";

export type ModuloAudit = Modulo | "seguridad";

export type AccionAudit =
  | "CREAR"
  | "EDITAR"
  | "ELIMINAR"
  | "EMITIR"
  | "ANULAR"
  | "CONFIRMAR"
  | "CANCELAR"
  | "RECIBIR"
  | "AJUSTE"
  | "TRANSFERENCIA"
  | "LOGIN"
  | "LOGOUT"
  | "REGISTRO";

type AuditInput = {
  modulo?: ModuloAudit | null;
  entidad: string;
  entidadId?: string | number | null;
  accion: AccionAudit;
  resumen: string;
  /** Estado previo del registro (null/omitido para altas). */
  antes?: unknown;
  /** Estado posterior del registro (null/omitido para bajas). */
  despues?: unknown;
  /**
   * Autor de la operación. Si se omite, se toma de la sesión actual.
   * Pasarlo explícito cuando todavía no hay sesión (login, registro) o ya se cerró (logout).
   */
  usuario?: { id: number | null; nombre: string | null } | null;
  /**
   * Empresa del evento. Si se omite, se toma de la sesión actual. Pasarla explícita
   * en eventos sin sesión que sí tienen empresa (ej. registro con código de invitación).
   */
  empresaId?: number | null;
};

/** Convierte valores de Prisma (Decimal, Date, BigInt) a JSON plano y serializable. */
function plano(v: unknown): Prisma.InputJsonValue | null {
  if (v === undefined || v === null) return null;
  // Decimal y Date ya tienen toJSON (string / ISO); solo BigInt necesita ayuda.
  return JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val)));
}

type Plano = Record<string, unknown>;
type Diff = Record<string, { antes: unknown; despues: unknown }>;

/** Campos que cambiaron entre dos snapshots ya aplanados. */
function calcularDiff(antes: unknown, despues: unknown): Diff | null {
  if (!antes || !despues || typeof antes !== "object" || typeof despues !== "object") return null;
  const a = antes as Plano;
  const b = despues as Plano;
  const diff: Diff = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diff[k] = { antes: a[k] ?? null, despues: b[k] ?? null };
  }
  return Object.keys(diff).length ? diff : null;
}

/** Quita campos sensibles de un snapshot antes de guardarlo (contraseñas, tokens). */
export function sinSecretos<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  const copia = { ...(obj as Record<string, unknown>) };
  delete copia.passwordHash;
  return copia as T;
}

/**
 * Registra una operación en la bitácora de auditoría.
 * Es "best-effort": si falla, loguea el error pero NUNCA interrumpe la operación de negocio.
 */
export async function auditar(input: AuditInput): Promise<void> {
  try {
    let usuarioId: number | null;
    let usuarioNombre: string | null;
    let empresaId: number | null;
    if (input.usuario !== undefined) {
      usuarioId = input.usuario?.id ?? null;
      usuarioNombre = input.usuario?.nombre ?? null;
      empresaId = input.empresaId ?? null;
    } else {
      const s = await getSession();
      usuarioId = s?.userId ?? null;
      usuarioNombre = s?.nombre ?? null;
      empresaId = input.empresaId ?? s?.empresaId ?? null;
    }

    let ip: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    } catch {
      // headers() no disponible fuera de un request: lo dejamos en null.
    }

    const antes = plano(input.antes);
    const despues = plano(input.despues);
    const diff = calcularDiff(antes, despues);

    await prisma.auditoria.create({
      data: {
        empresaId,
        usuarioId,
        usuarioNombre,
        modulo: input.modulo ?? null,
        entidad: input.entidad,
        entidadId: input.entidadId != null ? String(input.entidadId) : null,
        accion: input.accion,
        resumen: input.resumen,
        ip,
        ...(antes || despues ? { datos: { antes, despues, diff } as Prisma.InputJsonValue } : {}),
      },
    });
  } catch (e) {
    console.error("[auditoria] no se pudo registrar la operación:", e);
  }
}
