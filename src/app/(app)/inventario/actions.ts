"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/auth";
import { moverStock } from "@/lib/stock";
import { ErrorNegocio, formObj, mensajeError, zNum, zodMsg, zOptStr, type ActionState } from "@/lib/action";

// ───────── Productos ─────────

const productoSchema = z.object({
  id: z.coerce.number().int().optional(),
  codigo: z.string().trim().min(1, "requerido").toUpperCase(),
  nombre: z.string().trim().min(2, "requerido"),
  descripcion: zOptStr,
  unidad: z.string().trim().min(1).default("UN"),
  categoriaId: z.string().optional().transform((v) => (v ? Number(v) : null)),
  precioVenta: zNum.min(0),
  costo: zNum.min(0),
  tasaIva: z.coerce.number().refine((v) => [0, 5, 10].includes(v), "0, 5 o 10"),
  stockMinimo: zNum.min(0),
  activo: z.string().optional().transform((v) => v === "on"),
});

export async function guardarProducto(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requirePermiso("inventario");
    const p = productoSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { id, ...data } = p.data;
    if (id) await prisma.producto.update({ where: { id }, data });
    else await prisma.producto.create({ data });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/inventario/productos");
  redirect("/inventario/productos");
}

// ───────── Categorías y depósitos ─────────

export async function crearCategoria(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requirePermiso("inventario");
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    await prisma.categoria.create({ data: { nombre } });
    revalidatePath("/inventario/categorias");
    return { ok: `Categoría "${nombre}" creada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function crearDeposito(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requirePermiso("inventario");
    const nombre = String(fd.get("nombre") ?? "").trim();
    const direccion = String(fd.get("direccion") ?? "").trim() || null;
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    await prisma.deposito.create({ data: { nombre, direccion } });
    revalidatePath("/inventario/depositos");
    return { ok: `Depósito "${nombre}" creado` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

// ───────── Ajustes y transferencias ─────────

const ajusteSchema = z.object({
  productoId: z.coerce.number().int().positive("elegí un producto"),
  depositoId: z.coerce.number().int().positive("elegí un depósito"),
  modo: z.enum(["sumar", "restar", "fijar"]),
  cantidad: zNum.min(0),
  nota: zOptStr,
});

export async function ajustarStock(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requirePermiso("inventario");
    const p = ajusteSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { productoId, depositoId, modo, cantidad, nota } = p.data;

    await prisma.$transaction(async (tx) => {
      let delta = modo === "sumar" ? cantidad : -cantidad;
      if (modo === "fijar") {
        const actual = await tx.stock.findUnique({ where: { productoId_depositoId: { productoId, depositoId } } });
        delta = cantidad - Number(actual?.cantidad ?? 0);
      }
      if (delta === 0) throw new ErrorNegocio("El ajuste no cambia el stock");
      await moverStock(tx, { productoId, depositoId, cantidad: delta, origen: "AJUSTE", nota, usuarioId: s.userId });
    });

    revalidatePath("/inventario", "layout");
    return { ok: "Ajuste registrado" };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

const transferSchema = z.object({
  productoId: z.coerce.number().int().positive("elegí un producto"),
  origenId: z.coerce.number().int().positive("elegí el depósito origen"),
  destinoId: z.coerce.number().int().positive("elegí el depósito destino"),
  cantidad: zNum.positive("debe ser mayor a 0"),
  nota: zOptStr,
});

export async function transferirStock(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requirePermiso("inventario");
    const p = transferSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { productoId, origenId, destinoId, cantidad, nota } = p.data;
    if (origenId === destinoId) throw new ErrorNegocio("El origen y el destino deben ser distintos");

    await prisma.$transaction(async (tx) => {
      const ref = `TRF-${Date.now()}`;
      await moverStock(tx, { productoId, depositoId: origenId, cantidad: -cantidad, origen: "TRANSFERENCIA", referencia: ref, nota, usuarioId: s.userId });
      await moverStock(tx, { productoId, depositoId: destinoId, cantidad, origen: "TRANSFERENCIA", referencia: ref, nota, usuarioId: s.userId });
    });

    revalidatePath("/inventario", "layout");
    return { ok: "Transferencia registrada" };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
