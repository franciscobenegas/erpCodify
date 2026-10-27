import "server-only";
import { z } from "zod";
import { prisma } from "./prisma";
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

export async function productosOpcion(): Promise<ProductoOpcion[]> {
  const ps = await prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
  return ps.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    unidad: p.unidad,
    precioVenta: toNum(p.precioVenta),
    costo: toNum(p.costo),
    tasaIva: p.tasaIva,
  }));
}
