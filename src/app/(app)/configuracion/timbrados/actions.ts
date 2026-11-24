"use server";

import { z } from "zod";
import type { TipoComprobante } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { TIPOS_COMPROBANTE, nombreComprobante } from "@/lib/comprobante";
import { ErrorNegocio, formObj, mensajeError, zodMsg, type ActionState } from "@/lib/action";

const schema = z
  .object({
    timbrado: z.string().trim().regex(/^\d{8}$/, "8 dígitos"),
    timbradoInicio: z.coerce.date(),
    timbradoFin: z.coerce.date(),
    siguienteNumero: z.coerce.number().int().min(1),
  })
  .refine((d) => d.timbradoFin > d.timbradoInicio, { message: "la vigencia final debe ser posterior", path: ["timbradoFin"] });

const esTipoValido = (t: string): t is TipoComprobante => TIPOS_COMPROBANTE.some((x) => x.tipo === t);

/** Crea o actualiza el timbrado/numeración de un punto de venta y tipo de comprobante. */
export async function guardarTimbrado(puntoVentaId: number, tipo: TipoComprobante, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    if (!esTipoValido(tipo)) throw new ErrorNegocio("Tipo de comprobante inválido");
    const punto = await db.puntoVenta.findUnique({ where: { id: puntoVentaId }, select: { id: true } });
    if (!punto) throw new ErrorNegocio("Punto de venta inválido");
    const p = schema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const activo = fd.get("activo") != null;
    const data = { ...p.data, activo };

    // TimbradoComprobante no está auto-scopeado: empresaId/puntoVentaId explícitos.
    const clave = { puntoVentaId_tipo: { puntoVentaId, tipo } };
    const antes = await db.timbradoComprobante.findUnique({ where: clave });
    const despues = await db.timbradoComprobante.upsert({
      where: clave,
      create: { empresaId: s.empresaId, puntoVentaId, tipo, ...data },
      update: data,
    });
    await auditar({
      modulo: "configuracion",
      entidad: "TimbradoComprobante",
      entidadId: despues.id,
      accion: antes ? "EDITAR" : "CREAR",
      resumen: `${antes ? "Actualizó" : "Cargó"} el timbrado de ${nombreComprobante(tipo)}`,
      antes,
      despues,
    });
    revalidatePath("/configuracion/timbrados");
    return { ok: `Timbrado de ${nombreComprobante(tipo)} guardado` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
