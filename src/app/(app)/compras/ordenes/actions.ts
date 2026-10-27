"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoOrdenCompra } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/auth";
import { moverStock } from "@/lib/stock";
import { parseLineas } from "@/lib/lineas";
import { ErrorNegocio, formObj, mensajeError, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const cabecera = z.object({
  id: z.coerce.number().int().optional(),
  proveedorId: z.coerce.number().int().positive("elegí un proveedor"),
  depositoId: z.coerce.number().int().positive("elegí un depósito"),
  observacion: zOptStr,
});

export async function guardarOrden(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: number;
  try {
    const s = await requirePermiso("compras");
    const p = cabecera.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const lineas = parseLineas(fd.get("lineas")).map((l) => ({
      productoId: l.productoId,
      cantidad: l.cantidad,
      costo: Math.round(l.precio),
      subtotal: Math.round(l.cantidad * l.precio),
    }));
    const total = lineas.reduce((a, l) => a + l.subtotal, 0);
    const { id: ordenId, ...cab } = p.data;
    const confirmar = fd.get("accion") === "confirmar";

    id = await prisma.$transaction(async (tx) => {
      if (ordenId) {
        const actual = await tx.ordenCompra.findUniqueOrThrow({ where: { id: ordenId } });
        if (actual.estado !== "BORRADOR") throw new ErrorNegocio("Solo se pueden editar órdenes en borrador");
        await tx.ordenCompraLinea.deleteMany({ where: { ordenId } });
        await tx.ordenCompra.update({
          where: { id: ordenId },
          data: { ...cab, total, estado: confirmar ? "CONFIRMADA" : "BORRADOR", lineas: { create: lineas } },
        });
        return ordenId;
      }
      const o = await tx.ordenCompra.create({
        data: { ...cab, total, estado: confirmar ? "CONFIRMADA" : "BORRADOR", usuarioId: s.userId, lineas: { create: lineas } },
      });
      return o.id;
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/compras/ordenes");
  redirect(`/compras/ordenes/${id}`);
}

async function cambiarEstado(id: number, desde: EstadoOrdenCompra[], hacia: EstadoOrdenCompra) {
  const r = await prisma.ordenCompra.updateMany({ where: { id, estado: { in: desde } }, data: { estado: hacia } });
  if (r.count === 0) throw new ErrorNegocio("La orden cambió de estado. Recargá la página.");
}

export async function confirmarOrden(id: number, _: ActionState): Promise<ActionState> {
  try {
    await requirePermiso("compras");
    await cambiarEstado(id, ["BORRADOR"], "CONFIRMADA");
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/compras/ordenes/${id}`);
  return { ok: "Orden confirmada" };
}

export async function cancelarOrden(id: number, _: ActionState): Promise<ActionState> {
  try {
    await requirePermiso("compras");
    await cambiarEstado(id, ["BORRADOR", "CONFIRMADA"], "CANCELADA");
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/compras/ordenes/${id}`);
  return { ok: "Orden cancelada" };
}

/** Recibe la mercadería: ingresa stock al depósito y actualiza el costo de cada producto. */
export async function recibirOrden(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const s = await requirePermiso("compras");
    const facturaProveedor = String(fd.get("facturaProveedor") ?? "").trim() || null;

    await prisma.$transaction(async (tx) => {
      const o = await tx.ordenCompra.findUniqueOrThrow({ where: { id }, include: { lineas: true } });
      if (o.estado !== "CONFIRMADA") throw new ErrorNegocio("Solo se reciben órdenes confirmadas");

      for (const l of o.lineas) {
        await moverStock(tx, {
          productoId: l.productoId,
          depositoId: o.depositoId,
          cantidad: Number(l.cantidad),
          origen: "COMPRA",
          referencia: `OC #${o.id}${facturaProveedor ? ` · Fact. ${facturaProveedor}` : ""}`,
          usuarioId: s.userId,
        });
        // Costo = último costo de compra (simple). Para costo promedio ponderado, calcular acá.
        await tx.producto.update({ where: { id: l.productoId }, data: { costo: l.costo } });
      }
      await tx.ordenCompra.update({ where: { id }, data: { estado: "RECIBIDA", recibidaAt: new Date(), facturaProveedor } });
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/compras/ordenes/${id}`);
  revalidatePath("/compras/ordenes");
  return { ok: "Mercadería recibida e ingresada al stock" };
}
