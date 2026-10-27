"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermiso } from "@/lib/auth";
import { moverStock } from "@/lib/stock";
import { parseLineas } from "@/lib/lineas";
import { calcularTotales, formatNumeroFactura } from "@/lib/iva";
import { hoyISO } from "@/lib/utils";
import { ErrorNegocio, formObj, mensajeError, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const cabecera = z.object({
  id: z.coerce.number().int().optional(),
  clienteId: z.coerce.number().int().positive("elegí un cliente"),
  depositoId: z.coerce.number().int().positive("elegí un depósito"),
  condicion: z.enum(["CONTADO", "CREDITO"]),
  observacion: zOptStr,
});

/** Crea o actualiza una factura en BORRADOR. Si se pulsó "emitir", la emite en el mismo paso. */
export async function guardarFactura(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: number;
  try {
    const s = await requirePermiso("ventas");
    const p = cabecera.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const lineas = parseLineas(fd.get("lineas"));

    const productos = await prisma.producto.findMany({ where: { id: { in: lineas.map((l) => l.productoId) } } });
    const porId = new Map(productos.map((x) => [x.id, x]));

    const detalle = lineas.map((l) => {
      const prod = porId.get(l.productoId);
      if (!prod) throw new ErrorNegocio("Producto inexistente en una línea");
      return {
        productoId: prod.id,
        descripcion: prod.nombre,
        cantidad: l.cantidad,
        precioUnitario: Math.round(l.precio),
        tasaIva: prod.tasaIva, // la tasa la define el producto, no el formulario
        subtotal: Math.round(l.cantidad * l.precio),
      };
    });
    const totales = calcularTotales(detalle);
    const { id: facturaId, ...cab } = p.data;

    id = await prisma.$transaction(async (tx) => {
      if (facturaId) {
        const actual = await tx.factura.findUniqueOrThrow({ where: { id: facturaId } });
        if (actual.estado !== "BORRADOR") throw new ErrorNegocio("Solo se pueden editar facturas en borrador");
        await tx.facturaLinea.deleteMany({ where: { facturaId } });
        await tx.factura.update({ where: { id: facturaId }, data: { ...cab, ...totales, lineas: { create: detalle } } });
        return facturaId;
      }
      const f = await tx.factura.create({ data: { ...cab, ...totales, usuarioId: s.userId, lineas: { create: detalle } } });
      return f.id;
    });

    if (fd.get("accion") === "emitir") {
      try {
        await emitirInterno(id, s.userId);
      } catch (e) {
        // El borrador ya quedó guardado: mostrar el error en su detalle para no duplicarlo
        revalidatePath("/ventas/facturas");
        redirect(`/ventas/facturas/${id}?error=${encodeURIComponent(mensajeError(e))}`);
      }
    }
  } catch (e) {
    unstable_rethrow(e); // deja pasar el redirect de arriba
    return { error: mensajeError(e) };
  }
  revalidatePath("/ventas/facturas");
  redirect(`/ventas/facturas/${id}`);
}

async function emitirInterno(id: number, usuarioId: number) {
  await prisma.$transaction(async (tx) => {
    const f = await tx.factura.findUniqueOrThrow({ where: { id }, include: { lineas: true } });
    if (f.estado !== "BORRADOR") throw new ErrorNegocio("La factura ya fue emitida o anulada");

    // Reservar número: el UPDATE bloquea la fila de Empresa hasta el fin de la transacción,
    // así dos emisiones simultáneas nunca obtienen el mismo número.
    const emp = await tx.empresa.update({ where: { id: 1 }, data: { siguienteNumero: { increment: 1 } } });
    const hoy = new Date();
    const dia = hoyISO(); // fecha de hoy en Paraguay, comparada contra columnas @db.Date
    if (dia < emp.timbradoInicio.toISOString().slice(0, 10) || dia > emp.timbradoFin.toISOString().slice(0, 10)) {
      throw new ErrorNegocio("El timbrado no está vigente. Actualizalo en Configuración → Empresa.");
    }
    const numero = formatNumeroFactura(emp.establecimiento, emp.puntoExpedicion, emp.siguienteNumero - 1);

    for (const l of f.lineas) {
      await moverStock(tx, {
        productoId: l.productoId,
        depositoId: f.depositoId,
        cantidad: -Number(l.cantidad),
        origen: "VENTA",
        referencia: `Factura ${numero}`,
        usuarioId,
      });
    }

    await tx.factura.update({ where: { id }, data: { estado: "EMITIDA", numero, timbrado: emp.timbrado, fecha: hoy } });
  });
}

export async function emitirFactura(id: number, _: ActionState): Promise<ActionState> {
  try {
    const s = await requirePermiso("ventas");
    await emitirInterno(id, s.userId);
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/ventas/facturas/${id}`);
  revalidatePath("/ventas/facturas");
  return { ok: "Factura emitida" };
}

export async function anularFactura(id: number, _: ActionState): Promise<ActionState> {
  try {
    const s = await requirePermiso("ventas");
    await prisma.$transaction(async (tx) => {
      const f = await tx.factura.findUniqueOrThrow({ where: { id }, include: { lineas: true } });
      if (f.estado !== "EMITIDA") throw new ErrorNegocio("Solo se pueden anular facturas emitidas");
      for (const l of f.lineas) {
        await moverStock(tx, {
          productoId: l.productoId,
          depositoId: f.depositoId,
          cantidad: Number(l.cantidad),
          origen: "ANULACION_VENTA",
          referencia: `Anulación ${f.numero}`,
          usuarioId: s.userId,
        });
      }
      await tx.factura.update({ where: { id }, data: { estado: "ANULADA", anuladaAt: new Date() } });
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/ventas/facturas/${id}`);
  revalidatePath("/ventas/facturas");
  return { ok: "Factura anulada. El stock fue repuesto." };
}

export async function eliminarBorrador(id: number, _: ActionState): Promise<ActionState> {
  try {
    await requirePermiso("ventas");
    const r = await prisma.factura.deleteMany({ where: { id, estado: "BORRADOR" } });
    if (r.count === 0) throw new ErrorNegocio("Solo se pueden eliminar borradores");
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/ventas/facturas");
  redirect("/ventas/facturas");
}
