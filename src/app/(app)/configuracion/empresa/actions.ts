"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { formObj, mensajeError, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const schema = z.object({
  razonSocial: z.string().trim().min(2, "requerido"),
  ruc: z.string().trim().regex(/^\d{5,8}-\d$/, "formato 80000000-1"),
  direccion: zOptStr,
  telefono: zOptStr,
  email: zOptStr,
});

export async function guardarEmpresa(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const p = schema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const antes = await db.empresa.findUnique({ where: { id: s.empresaId } });
    const despues = await db.empresa.update({ where: { id: s.empresaId }, data: p.data });
    await auditar({ modulo: "configuracion", entidad: "Empresa", entidadId: s.empresaId, accion: "EDITAR", resumen: `Actualizó los datos de la empresa`, antes, despues });
    revalidatePath("/configuracion/empresa");
    return { ok: "Datos guardados" };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
