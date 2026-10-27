"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/auth";
import { formObj, mensajeError, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const schema = z
  .object({
    razonSocial: z.string().trim().min(2, "requerido"),
    ruc: z.string().trim().regex(/^\d{5,8}-\d$/, "formato 80000000-1"),
    direccion: zOptStr,
    telefono: zOptStr,
    email: zOptStr,
    timbrado: z.string().trim().regex(/^\d{8}$/, "8 dígitos"),
    timbradoInicio: z.coerce.date(),
    timbradoFin: z.coerce.date(),
    establecimiento: z.string().regex(/^\d{3}$/, "3 dígitos"),
    puntoExpedicion: z.string().regex(/^\d{3}$/, "3 dígitos"),
    siguienteNumero: z.coerce.number().int().min(1),
  })
  .refine((d) => d.timbradoFin > d.timbradoInicio, { message: "la vigencia final debe ser posterior", path: ["timbradoFin"] });

export async function guardarEmpresa(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requirePermiso("configuracion");
    const p = schema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    await prisma.empresa.upsert({ where: { id: 1 }, create: { id: 1, ...p.data }, update: p.data });
    revalidatePath("/configuracion/empresa");
    return { ok: "Datos guardados" };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
