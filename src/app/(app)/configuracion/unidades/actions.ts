"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { formObj, mensajeError, zNum, zodMsg, type ActionState } from "@/lib/action";

const unidadSchema = z.object({
  codigo: z.string().trim().min(1, "requerido").toUpperCase(),
  nombre: z.string().trim().min(2, "requerido"),
  decimales: z.coerce.number().int().min(0).max(4).default(0),
  factor: zNum.positive("debe ser mayor a 0").default(1),
});

export async function crearUnidad(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const p = unidadSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const despues = await db.unidadMedida.create({ data: { ...p.data, empresaId: s.empresaId } });
    await auditar({ modulo: "configuracion", entidad: "UnidadMedida", entidadId: despues.id, accion: "CREAR", resumen: `Creó la unidad "${despues.codigo} · ${despues.nombre}"`, despues });
    revalidatePath("/configuracion/unidades");
    return { ok: `Unidad "${despues.codigo}" creada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
