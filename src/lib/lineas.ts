import "server-only";
import { z } from "zod";
import { getTenant } from "./auth";
import { toNum } from "./utils";
import { ErrorNegocio } from "./action";
import type { ProductoOpcion } from "@/components/lineas-editor";

const lineasSchema = z
  .array(
    z.object({
      productoId: z.number().int().positive(),
      cantidad: z.number().positive(),
      precio: z.number().min(0),
    }),
  )
  .min(1, "Agregá al menos una línea");

export function parseLineas(raw: FormDataEntryValue | null) {
  let data: unknown;
  try {
    data = JSON.parse(String(raw ?? "[]"));
  } catch {
    throw new ErrorNegocio("Líneas inválidas");
  }
  const p = lineasSchema.safeParse(data);
  if (!p.success) throw new ErrorNegocio(p.error.issues[0].message);
  return p.data;
}

/**
 * Productos disponibles para una línea. Filtra por disponibilidad según el modo
 * (solo habilitados para venta / compra) y adjunta unidades alternativas, escalas
 * de precio por cantidad y códigos de barras para la conversión y búsqueda.
 */
export async function productosOpcion(modo?: "venta" | "compra"): Promise<ProductoOpcion[]> {
  const { db } = await getTenant();
  const disponibilidad =
    modo === "venta" ? { habilitadoVenta: true } : modo === "compra" ? { habilitadoCompra: true } : {};
  const ps = await db.producto.findMany({
    where: { activo: true, ...disponibilidad },
    orderBy: { nombre: "asc" },
    include: { unidadesAlt: true, preciosCantidad: { orderBy: { cantidadMin: "asc" } } },
  });
  return ps.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    unidad: p.unidad,
    precioVenta: toNum(p.precioVenta),
    costo: toNum(p.costo),
    tasaIva: p.tasaIva,
    codigoBarras: p.codigoBarras,
    codigosAlt: p.codigosAlt,
    unidadesAlt: p.unidadesAlt.map((u) => ({ nombre: u.nombre, factor: toNum(u.factor) })),
    preciosCantidad: p.preciosCantidad.map((x) => ({ cantidadMin: toNum(x.cantidadMin), precio: toNum(x.precio) })),
  }));
}
