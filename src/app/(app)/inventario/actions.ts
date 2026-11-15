"use server";

import { z } from "zod";
import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenant } from "@/lib/auth";
import { moverStock } from "@/lib/stock";
import { auditar } from "@/lib/auditoria";
import { ErrorNegocio, formObj, mensajeError, zNum, zodMsg, zOptStr, type ActionState } from "@/lib/action";

const MAX_IMAGEN = 5 * 1024 * 1024; // 5 MB

/** Sube la imagen de un producto a Vercel Blob y devuelve su URL pública. */
async function subirImagen(file: File, empresaId: number): Promise<string> {
  if (!file.type.startsWith("image/")) throw new ErrorNegocio("El archivo debe ser una imagen.");
  if (file.size > MAX_IMAGEN) throw new ErrorNegocio("La imagen no puede superar los 5 MB.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ErrorNegocio("Falta configurar el almacenamiento de imágenes (BLOB_READ_WRITE_TOKEN).");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
  const blob = await put(`productos/${empresaId}/${randomUUID()}.${ext}`, file, { access: "public" });
  return blob.url;
}

/** Borra una imagen de Blob sin interrumpir la operación si falla (best-effort). */
async function borrarImagen(url: string | null | undefined) {
  if (!url) return;
  try {
    await del(url);
  } catch (e) {
    console.error("[blob] no se pudo borrar la imagen:", e);
  }
}

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
    const { s, db } = await getTenant("inventario");
    const p = productoSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { id, ...data } = p.data;
    // La categoría referenciada debe ser de esta empresa (el id viene del formulario).
    if (data.categoriaId != null && !(await db.categoria.findUnique({ where: { id: data.categoriaId }, select: { id: true } }))) {
      throw new ErrorNegocio("Categoría inválida");
    }

    const archivo = fd.get("imagen");
    const nuevaImagen = archivo instanceof File && archivo.size > 0;
    const quitarImagen = fd.get("quitarImagen") === "on";

    if (id) {
      const antes = await db.producto.findUnique({ where: { id } });
      if (!antes) throw new ErrorNegocio("El producto no existe.");

      let imagenUrl = antes.imagenUrl;
      if (nuevaImagen) imagenUrl = await subirImagen(archivo, s.empresaId);
      else if (quitarImagen) imagenUrl = null;

      const despues = await db.producto.update({ where: { id }, data: { ...data, imagenUrl } });
      // Si la imagen cambió o se quitó, borrar la anterior de Blob.
      if (antes.imagenUrl && antes.imagenUrl !== imagenUrl) await borrarImagen(antes.imagenUrl);
      await auditar({ modulo: "inventario", entidad: "Producto", entidadId: id, accion: "EDITAR", resumen: `Editó el producto ${despues.codigo} · ${despues.nombre}`, antes, despues });
    } else {
      const imagenUrl = nuevaImagen ? await subirImagen(archivo, s.empresaId) : null;
      const despues = await db.producto.create({ data: { ...data, empresaId: s.empresaId, imagenUrl } });
      await auditar({ modulo: "inventario", entidad: "Producto", entidadId: despues.id, accion: "CREAR", resumen: `Creó el producto ${despues.codigo} · ${despues.nombre}`, despues });
    }
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/inventario/productos");
  redirect("/inventario/productos");
}

// ───────── Categorías y depósitos ─────────

export async function crearCategoria(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("inventario");
    const nombre = String(fd.get("nombre") ?? "").trim();
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    const despues = await db.categoria.create({ data: { nombre, empresaId: s.empresaId } });
    await auditar({ modulo: "inventario", entidad: "Categoria", entidadId: despues.id, accion: "CREAR", resumen: `Creó la categoría "${nombre}"`, despues });
    revalidatePath("/inventario/categorias");
    return { ok: `Categoría "${nombre}" creada` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function crearDeposito(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("inventario");
    const nombre = String(fd.get("nombre") ?? "").trim();
    const direccion = String(fd.get("direccion") ?? "").trim() || null;
    if (!nombre) throw new ErrorNegocio("Ingresá un nombre");
    const despues = await db.deposito.create({ data: { nombre, direccion, empresaId: s.empresaId } });
    await auditar({ modulo: "inventario", entidad: "Deposito", entidadId: despues.id, accion: "CREAR", resumen: `Creó el depósito "${nombre}"`, despues });
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
    const { s, db } = await getTenant("inventario");
    const p = ajusteSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { productoId, depositoId, modo, cantidad, nota } = p.data;

    // Producto y depósito deben ser de esta empresa (los ids vienen del formulario).
    const [okProd, okDep] = await Promise.all([
      db.producto.findUnique({ where: { id: productoId }, select: { id: true } }),
      db.deposito.findUnique({ where: { id: depositoId }, select: { id: true } }),
    ]);
    if (!okProd) throw new ErrorNegocio("Producto inválido");
    if (!okDep) throw new ErrorNegocio("Depósito inválido");

    const r = await db.$transaction(async (tx) => {
      const previo = Number((await tx.stock.findUnique({ where: { productoId_depositoId: { productoId, depositoId } } }))?.cantidad ?? 0);
      let delta = modo === "sumar" ? cantidad : -cantidad;
      if (modo === "fijar") delta = cantidad - previo;
      if (delta === 0) throw new ErrorNegocio("El ajuste no cambia el stock");
      await moverStock(tx, { empresaId: s.empresaId, productoId, depositoId, cantidad: delta, origen: "AJUSTE", nota, usuarioId: s.userId });
      return { previo, delta };
    });

    const [producto, deposito] = await Promise.all([
      db.producto.findUnique({ where: { id: productoId }, select: { codigo: true, nombre: true } }),
      db.deposito.findUnique({ where: { id: depositoId }, select: { nombre: true } }),
    ]);
    await auditar({
      modulo: "inventario",
      entidad: "Stock",
      entidadId: `${productoId}-${depositoId}`,
      accion: "AJUSTE",
      resumen: `Ajustó stock de ${producto?.nombre ?? `#${productoId}`} en ${deposito?.nombre ?? `#${depositoId}`} (${r.delta > 0 ? "+" : ""}${r.delta})`,
      antes: { productoId, depositoId, cantidad: r.previo },
      despues: { productoId, depositoId, cantidad: r.previo + r.delta, modo, nota },
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
    const { s, db } = await getTenant("inventario");
    const p = transferSchema.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const { productoId, origenId, destinoId, cantidad, nota } = p.data;
    if (origenId === destinoId) throw new ErrorNegocio("El origen y el destino deben ser distintos");

    // Producto y depósitos deben ser de esta empresa (los ids vienen del formulario).
    const [okProd, okOrigen, okDestino] = await Promise.all([
      db.producto.findUnique({ where: { id: productoId }, select: { id: true } }),
      db.deposito.findUnique({ where: { id: origenId }, select: { id: true } }),
      db.deposito.findUnique({ where: { id: destinoId }, select: { id: true } }),
    ]);
    if (!okProd) throw new ErrorNegocio("Producto inválido");
    if (!okOrigen || !okDestino) throw new ErrorNegocio("Depósito inválido");

    const ref = `TRF-${Date.now()}`;
    await db.$transaction(async (tx) => {
      await moverStock(tx, { empresaId: s.empresaId, productoId, depositoId: origenId, cantidad: -cantidad, origen: "TRANSFERENCIA", referencia: ref, nota, usuarioId: s.userId });
      await moverStock(tx, { empresaId: s.empresaId, productoId, depositoId: destinoId, cantidad, origen: "TRANSFERENCIA", referencia: ref, nota, usuarioId: s.userId });
    });

    const producto = await db.producto.findUnique({ where: { id: productoId }, select: { nombre: true } });
    await auditar({
      modulo: "inventario",
      entidad: "Stock",
      entidadId: String(productoId),
      accion: "TRANSFERENCIA",
      resumen: `Transfirió ${cantidad} de ${producto?.nombre ?? `#${productoId}`} entre depósitos`,
      despues: { productoId, origenId, destinoId, cantidad, referencia: ref, nota },
    });

    revalidatePath("/inventario", "layout");
    return { ok: "Transferencia registrada" };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
