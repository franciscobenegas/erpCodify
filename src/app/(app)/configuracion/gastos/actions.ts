"use server";

import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/auth";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, mensajeError, type ActionState } from "@/lib/action";

export async function crearCuentaGasto(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    const despues = await db.cuentaGasto.create({ data: { nombre, empresaId: s.empresaId } });
    await auditar({ modulo: "configuracion", entidad: "CuentaGasto", entidadId: despues.id, accion: "CREAR", resumen: `Creó la cuenta de gasto "${nombre}"`, despues });
    revalidatePath("/configuracion/gastos");
    return { ok: `Cuenta de gasto "${nombre}" creada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function crearCentroCosto(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("configuracion");
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    const despues = await db.centroCosto.create({ data: { nombre, empresaId: s.empresaId } });
    await auditar({ modulo: "configuracion", entidad: "CentroCosto", entidadId: despues.id, accion: "CREAR", resumen: `Creó el centro de costo "${nombre}"`, despues });
    revalidatePath("/configuracion/gastos");
    return { ok: `Centro de costo "${nombre}" creado` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
