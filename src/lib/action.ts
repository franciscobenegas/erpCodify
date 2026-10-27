import { z } from "zod";

export type ActionState = { error?: string; ok?: string } | undefined;

/** Convierte un ZodError en un mensaje legible. */
export function zodMsg(e: z.ZodError) {
  return e.issues.map((i) => `${i.path.join(".") || "dato"}: ${i.message}`).join(" · ");
}

/** Lee un FormData como objeto plano (strings). */
export const formObj = (fd: FormData) => Object.fromEntries(fd.entries()) as Record<string, string>;

/** Errores esperados que se muestran al usuario tal cual. */
export class ErrorNegocio extends Error {}

export function mensajeError(e: unknown): string {
  if (e instanceof ErrorNegocio) return e.message;
  if (e instanceof Error && e.message.startsWith("No tenés permiso")) return e.message;
  if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002")
    return "Ya existe un registro con ese valor único (código, nombre o email).";
  console.error(e);
  return "Ocurrió un error inesperado. Revisá el log del servidor.";
}

// Helpers zod para campos de formulario
export const zNum = z.coerce.number({ invalid_type_error: "debe ser un número" });
export const zOptStr = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));
