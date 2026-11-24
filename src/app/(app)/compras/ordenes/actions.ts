"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoOrdenCompra } from "@prisma/client";
import { getTenant } from "@/lib/auth";
import type { TenantDb } from "@/lib/tenant-db";
import { moverStock, serviciosDeLineas } from "@/lib/stock";
import { parseLineas } from "@/lib/lineas";
import { auditar } from "@/lib/auditoria";
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
    const { s, db } = await getTenant("compras");
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

    // Proveedor, depósito y productos deben ser de esta empresa (los ids vienen del formulario).
    const idsProd = [...new Set(lineas.map((l) => l.productoId))];
    const [okProveedor, okDeposito, nProd] = await Promise.all([
      db.contacto.findUnique({ where: { id: cab.proveedorId }, select: { id: true } }),
      db.deposito.findUnique({ where: { id: cab.depositoId }, select: { id: true } }),
      db.producto.count({ where: { id: { in: idsProd } } }),
    ]);
    if (!okProveedor) throw new ErrorNegocio("Proveedor inválido");
    if (!okDeposito) throw new ErrorNegocio("Depósito inválido");
    if (nProd !== idsProd.length) throw new ErrorNegocio("Hay un producto inexistente en una línea");

    const antes = ordenId ? await db.ordenCompra.findUnique({ where: { id: ordenId }, include: { lineas: true } }) : null;

    id = await db.$transaction(async (tx) => {
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
        data: { ...cab, total, estado: confirmar ? "CONFIRMADA" : "BORRADOR", empresaId: s.empresaId, usuarioId: s.userId, lineas: { create: lineas } },
      });
      return o.id;
    });

    const despues = await db.ordenCompra.findUnique({ where: { id }, include: { lineas: true } });
    await auditar({
      modulo: "compras",
      entidad: "OrdenCompra",
      entidadId: id,
      accion: ordenId ? "EDITAR" : "CREAR",
      resumen: `${ordenId ? "Editó" : "Creó"} la orden de compra #${id}${confirmar ? " (confirmada)" : ""}`,
      antes,
      despues,
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/compras/ordenes");
  redirect(`/compras/ordenes/${id}`);
}

async function cambiarEstado(db: TenantDb, id: number, desde: EstadoOrdenCompra[], hacia: EstadoOrdenCompra) {
  const r = await db.ordenCompra.updateMany({ where: { id, estado: { in: desde } }, data: { estado: hacia } });
  if (r.count === 0) throw new ErrorNegocio("La orden cambió de estado. Recargá la página.");
}

export async function confirmarOrden(id: number, _: ActionState): Promise<ActionState> {
  try {
    const { db } = await getTenant("compras");
    const antes = await db.ordenCompra.findUnique({ where: { id } });
    await cambiarEstado(db, id, ["BORRADOR"], "CONFIRMADA");
    const despues = await db.ordenCompra.findUnique({ where: { id } });
    await auditar({ modulo: "compras", entidad: "OrdenCompra", entidadId: id, accion: "CONFIRMAR", resumen: `Confirmó la orden de compra #${id}`, antes, despues });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/compras/ordenes/${id}`);
  return { ok: "Orden confirmada" };
}

export async function cancelarOrden(id: number, _: ActionState): Promise<ActionState> {
  try {
    const { db } = await getTenant("compras");
    const antes = await db.ordenCompra.findUnique({ where: { id } });
    await cambiarEstado(db, id, ["BORRADOR", "CONFIRMADA"], "CANCELADA");
    const despues = await db.ordenCompra.findUnique({ where: { id } });
    await auditar({ modulo: "compras", entidad: "OrdenCompra", entidadId: id, accion: "CANCELAR", resumen: `Canceló la orden de compra #${id}`, antes, despues });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/compras/ordenes/${id}`);
  return { ok: "Orden cancelada" };
}

/** Recibe la mercadería: ingresa stock al depósito y actualiza el costo de cada producto. */
export async function recibirOrden(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("compras");
    const facturaProveedor = String(fd.get("facturaProveedor") ?? "").trim() || null;
    const antes = await db.ordenCompra.findUnique({ where: { id }, include: { lineas: true } });

    await db.$transaction(async (tx) => {
      const o = await tx.ordenCompra.findUniqueOrThrow({ where: { id }, include: { lineas: true } });
      if (o.estado !== "CONFIRMADA") throw new ErrorNegocio("Solo se reciben órdenes confirmadas");

      // Los servicios (sin inventario) no ingresan stock, pero sí actualizan su costo.
      const servicios = await serviciosDeLineas(tx, o.lineas);
      for (const l of o.lineas) {
        if (!servicios.has(l.productoId)) {
          await moverStock(tx, {
            empresaId: s.empresaId,
            productoId: l.productoId,
            depositoId: o.depositoId,
            cantidad: Number(l.cantidad),
            origen: "COMPRA",
            referencia: `OC #${o.id}${facturaProveedor ? ` · Fact. ${facturaProveedor}` : ""}`,
            usuarioId: s.userId,
          });
        }
        // Costo = último costo de compra (simple). Para costo promedio ponderado, calcular acá.
        await tx.producto.update({ where: { id: l.productoId }, data: { costo: l.costo } });
      }
      await tx.ordenCompra.update({ where: { id }, data: { estado: "RECIBIDA", recibidaAt: new Date(), facturaProveedor } });
    });

    const despues = await db.ordenCompra.findUnique({ where: { id }, include: { lineas: true } });
    await auditar({ modulo: "compras", entidad: "OrdenCompra", entidadId: id, accion: "RECIBIR", resumen: `Recibió la mercadería de la orden de compra #${id}`, antes, despues });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/compras/ordenes/${id}`);
  revalidatePath("/compras/ordenes");
  return { ok: "Mercadería recibida e ingresada al stock" };
}
