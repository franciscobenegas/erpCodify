"use server";

import * as XLSX from "xlsx";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { getTenant } from "@/lib/auth";
import type { TenantDb } from "@/lib/tenant-db";
import type { SessionPayload } from "@/lib/session";
import { moverStock, serviciosDeLineas } from "@/lib/stock";
import { moverCaja } from "@/lib/caja";
import { parseLineas } from "@/lib/lineas";
import { calcularTotales, formatNumeroFactura } from "@/lib/iva";
import { nombreComprobante } from "@/lib/comprobante";
import { auditar } from "@/lib/auditoria";
import { hoyISO, toNum } from "@/lib/utils";
import { ErrorNegocio, formObj, mensajeError, zodMsg, zOptStr, type ActionState } from "@/lib/action";
import type { ImportResult, ItemImportado } from "@/components/lineas-editor";

const cabecera = z.object({
  id: z.coerce.number().int().optional(),
  clienteId: z.coerce.number().int().positive("elegí un cliente"),
  depositoId: z.coerce.number().int().positive("elegí un depósito"),
  puntoVentaId: z.coerce.number().int().positive("elegí un punto de venta"),
  tipoComprobante: z.enum(["FACTURA", "BOLETA", "PEQUENO_CONTRIBUYENTE", "AUTOFACTURA"]),
  condicion: z.enum(["CONTADO", "CREDITO"]),
  observacion: zOptStr,
});

const pagosSchema = z.array(z.object({ formaPagoId: z.number().int().positive(), monto: z.number().positive() })).default([]);

function parsePagos(raw: FormDataEntryValue | null) {
  let data: unknown;
  try {
    data = JSON.parse(String(raw ?? "[]"));
  } catch {
    throw new ErrorNegocio("Formas de pago inválidas");
  }
  const p = pagosSchema.safeParse(data);
  if (!p.success) throw new ErrorNegocio("Formas de pago inválidas");
  return p.data;
}

/** Crea o actualiza una factura en BORRADOR. Si se pulsó "emitir", la emite en el mismo paso. */
export async function guardarFactura(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: number;
  try {
    const { s, db } = await getTenant("ventas");
    const p = cabecera.safeParse(formObj(fd));
    if (!p.success) return { error: zodMsg(p.error) };
    const lineas = parseLineas(fd.get("lineas"));

    const productos = await db.producto.findMany({ where: { id: { in: lineas.map((l) => l.productoId) } } });
    const porId = new Map(productos.map((x) => [x.id, x]));

    const detalle = lineas.map((l) => {
      const prod = porId.get(l.productoId);
      if (!prod) throw new ErrorNegocio("Producto inexistente en una línea");
      const bruto = Math.round(l.cantidad * l.precio);
      const descuento = Math.min(Math.round(l.descuento), bruto); // el descuento nunca supera el bruto
      return {
        productoId: prod.id,
        descripcion: prod.nombre,
        cantidad: l.cantidad,
        precioUnitario: Math.round(l.precio),
        tasaIva: prod.tasaIva, // la tasa la define el producto, no el formulario
        descuento,
        subtotal: bruto - descuento,
      };
    });
    const totales = calcularTotales(detalle);
    const { id: facturaId, ...cab } = p.data;

    // Formas de pago (solo al contado). Cada medio debe tener cuenta destino configurada.
    const pagosInput = cab.condicion === "CONTADO" ? parsePagos(fd.get("pagos")) : [];
    let pagosData: { formaPagoId: number; cuentaId: number; monto: number }[] = [];
    if (pagosInput.length) {
      const formas = await db.formaPago.findMany({
        where: { id: { in: pagosInput.map((x) => x.formaPagoId) } },
        select: { id: true, nombre: true, cuentaId: true },
      });
      const formaPorId = new Map(formas.map((f) => [f.id, f]));
      pagosData = pagosInput.map((x) => {
        const forma = formaPorId.get(x.formaPagoId);
        if (!forma) throw new ErrorNegocio("Forma de pago inválida");
        if (forma.cuentaId == null) throw new ErrorNegocio(`La forma de pago "${forma.nombre}" no tiene cuenta destino configurada.`);
        return { formaPagoId: forma.id, cuentaId: forma.cuentaId, monto: Math.round(x.monto) };
      });
    }

    // Cliente, depósito y punto de venta deben ser de esta empresa (los ids vienen del formulario).
    const [okCliente, okDeposito, okPunto] = await Promise.all([
      db.contacto.findUnique({ where: { id: cab.clienteId }, select: { id: true } }),
      db.deposito.findUnique({ where: { id: cab.depositoId }, select: { id: true } }),
      db.puntoVenta.findUnique({ where: { id: cab.puntoVentaId }, select: { id: true } }),
    ]);
    if (!okCliente) throw new ErrorNegocio("Cliente inválido");
    if (!okDeposito) throw new ErrorNegocio("Depósito inválido");
    if (!okPunto) throw new ErrorNegocio("Punto de venta inválido");

    const antes = facturaId ? await db.factura.findUnique({ where: { id: facturaId }, include: { lineas: true, pagos: true } }) : null;

    id = await db.$transaction(async (tx) => {
      if (facturaId) {
        const actual = await tx.factura.findUniqueOrThrow({ where: { id: facturaId } });
        if (actual.estado !== "BORRADOR") throw new ErrorNegocio("Solo se pueden editar facturas en borrador");
        await tx.facturaLinea.deleteMany({ where: { facturaId } });
        await tx.facturaPago.deleteMany({ where: { facturaId } });
        await tx.factura.update({ where: { id: facturaId }, data: { ...cab, ...totales, lineas: { create: detalle }, pagos: { create: pagosData } } });
        return facturaId;
      }
      const f = await tx.factura.create({ data: { ...cab, ...totales, empresaId: s.empresaId, usuarioId: s.userId, lineas: { create: detalle }, pagos: { create: pagosData } } });
      return f.id;
    });

    const despues = await db.factura.findUnique({ where: { id }, include: { lineas: true } });
    await auditar({
      modulo: "ventas",
      entidad: "Factura",
      entidadId: id,
      accion: facturaId ? "EDITAR" : "CREAR",
      resumen: `${facturaId ? "Editó" : "Creó"} el borrador de factura #${id}`,
      antes,
      despues,
    });

    if (fd.get("accion") === "emitir") {
      try {
        await emitirInterno(db, s, id);
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

async function emitirInterno(db: TenantDb, s: SessionPayload, id: number) {
  const antes = await db.factura.findUnique({ where: { id }, include: { lineas: true } });
  await db.$transaction(async (tx) => {
    const f = await tx.factura.findUniqueOrThrow({ where: { id }, include: { lineas: true, pagos: true } });
    if (f.estado !== "BORRADOR") throw new ErrorNegocio("La factura ya fue emitida o anulada");

    // Al contado con formas de pago cargadas, deben igualar el total.
    if (f.condicion === "CONTADO" && f.pagos.length > 0) {
      const suma = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
      if (Math.abs(suma - Number(f.total)) > 0.5) {
        throw new ErrorNegocio(`Las formas de pago suman ${Math.round(suma)} y el total es ${Math.round(Number(f.total))}. Deben coincidir.`);
      }
    }

    // Punto de venta: aporta sucursal (establecimiento) y punto de expedición.
    if (!f.puntoVentaId) throw new ErrorNegocio("Elegí un punto de venta antes de emitir.");
    const pv = await tx.puntoVenta.findUnique({ where: { id: f.puntoVentaId }, include: { sucursal: true } });
    if (!pv || !pv.activo) throw new ErrorNegocio("El punto de venta no está disponible.");

    // Timbrado/numeración propios del punto de venta y tipo de comprobante.
    const clave = { puntoVentaId_tipo: { puntoVentaId: f.puntoVentaId, tipo: f.tipoComprobante } };
    const tc = await tx.timbradoComprobante.findUnique({ where: clave });
    if (!tc) throw new ErrorNegocio(`No hay timbrado para ${nombreComprobante(f.tipoComprobante)} en ${pv.nombre}. Cargalo en Configuración → Timbrados.`);
    if (!tc.activo) throw new ErrorNegocio(`El timbrado de ${nombreComprobante(f.tipoComprobante)} en ${pv.nombre} está inactivo.`);
    const hoy = new Date();
    const dia = hoyISO(); // fecha de hoy en Paraguay, comparada contra columnas @db.Date
    if (dia < tc.timbradoInicio.toISOString().slice(0, 10) || dia > tc.timbradoFin.toISOString().slice(0, 10)) {
      throw new ErrorNegocio(`El timbrado de ${nombreComprobante(f.tipoComprobante)} en ${pv.nombre} no está vigente. Actualizalo en Configuración → Timbrados.`);
    }
    // Reservar número: el UPDATE bloquea esta fila hasta el fin de la transacción,
    // así dos emisiones simultáneas del mismo punto/tipo nunca obtienen el mismo número.
    const tcUpd = await tx.timbradoComprobante.update({ where: clave, data: { siguienteNumero: { increment: 1 } } });
    const numero = formatNumeroFactura(pv.sucursal.establecimiento, pv.puntoExpedicion, tcUpd.siguienteNumero - 1);

    // Los servicios (sin inventario) no mueven stock.
    const servicios = await serviciosDeLineas(tx, f.lineas);
    for (const l of f.lineas) {
      if (servicios.has(l.productoId)) continue;
      await moverStock(tx, {
        empresaId: s.empresaId,
        productoId: l.productoId,
        depositoId: f.depositoId,
        cantidad: -Number(l.cantidad),
        origen: "VENTA",
        referencia: `Factura ${numero}`,
        usuarioId: s.userId,
      });
    }

    // Ingreso de caja por cada forma de pago (ventas al contado).
    for (const pago of f.pagos) {
      await moverCaja(tx, {
        empresaId: s.empresaId,
        cuentaId: pago.cuentaId,
        tipo: "INGRESO",
        monto: Number(pago.monto),
        concepto: `Venta ${numero}`,
        origen: "COBRO",
        referencia: `Factura ${numero}`,
        usuarioId: s.userId,
        fecha: hoy,
      });
    }

    await tx.factura.update({ where: { id }, data: { estado: "EMITIDA", numero, timbrado: tc.timbrado, fecha: hoy } });
  });

  const despues = await db.factura.findUnique({ where: { id }, include: { lineas: true } });
  await auditar({
    modulo: "ventas",
    entidad: "Factura",
    entidadId: id,
    accion: "EMITIR",
    resumen: `Emitió la factura ${despues?.numero ?? `#${id}`}`,
    antes,
    despues,
  });
}

export async function emitirFactura(id: number, _: ActionState): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("ventas");
    await emitirInterno(db, s, id);
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/ventas/facturas/${id}`);
  revalidatePath("/ventas/facturas");
  return { ok: "Factura emitida" };
}

export async function anularFactura(id: number, _: ActionState): Promise<ActionState> {
  try {
    const { s, db } = await getTenant("ventas");
    const antes = await db.factura.findUnique({ where: { id }, include: { lineas: true } });
    await db.$transaction(async (tx) => {
      const f = await tx.factura.findUniqueOrThrow({ where: { id }, include: { lineas: true, pagos: true } });
      if (f.estado !== "EMITIDA") throw new ErrorNegocio("Solo se pueden anular facturas emitidas");

      // Revierte el ingreso de caja de cada forma de pago (permite dejar la cuenta en negativo).
      for (const pago of f.pagos) {
        await moverCaja(tx, {
          empresaId: s.empresaId,
          cuentaId: pago.cuentaId,
          tipo: "EGRESO",
          monto: Number(pago.monto),
          concepto: `Anulación venta ${f.numero}`,
          origen: "COBRO",
          referencia: `Anulación ${f.numero}`,
          usuarioId: s.userId,
          permitirNegativo: true,
        });
      }

      const servicios = await serviciosDeLineas(tx, f.lineas);
      for (const l of f.lineas) {
        if (servicios.has(l.productoId)) continue;
        await moverStock(tx, {
          empresaId: s.empresaId,
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
    const despues = await db.factura.findUnique({ where: { id }, include: { lineas: true } });
    await auditar({ modulo: "ventas", entidad: "Factura", entidadId: id, accion: "ANULAR", resumen: `Anuló la factura ${antes?.numero ?? `#${id}`}`, antes, despues });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath(`/ventas/facturas/${id}`);
  revalidatePath("/ventas/facturas");
  return { ok: "Factura anulada. Se repuso el stock y se revirtieron los cobros en caja." };
}

// Normaliza un encabezado: minúsculas, sin acentos, sin espacios extra.
const norm = (k: string) => k.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Parsea un Excel (.xlsx) de ítems y lo convierte en líneas de factura.
 * Columnas esperadas (flexible, por nombre): Id o Código del Producto, Cantidad, Precio Unitario (opcional).
 * Resuelve cada fila contra los productos de la empresa habilitados para venta.
 */
export async function importarItemsFactura(fd: FormData): Promise<ImportResult> {
  const { db } = await getTenant("ventas");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { lineas: [], errores: ["No se recibió ningún archivo."] };
  if (file.size > 2 * 1024 * 1024) return { lineas: [], errores: ["El archivo supera los 2 MB."] };

  let filas: Record<string, unknown>[];
  try {
    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const hoja = wb.Sheets[wb.SheetNames[0]];
    if (!hoja) return { lineas: [], errores: ["El archivo no tiene hojas."] };
    filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: null });
  } catch {
    return { lineas: [], errores: ["No se pudo leer el archivo. ¿Es un .xlsx válido?"] };
  }
  if (filas.length === 0) return { lineas: [], errores: ["La planilla está vacía."] };

  // Detecta las columnas por nombre (tolerante a variantes).
  const claves = Object.keys(filas[0]);
  const buscarCol = (pred: (n: string) => boolean) => claves.find((k) => pred(norm(k)));
  const colCodigo = buscarCol((n) => n.includes("codigo") || n.includes("cod del") || n.includes("cod. del"));
  const colId = buscarCol((n) => n === "id" || n.includes("id del") || n.includes("id o cod"));
  const colCant = buscarCol((n) => n.startsWith("cant"));
  const colPrecio = buscarCol((n) => n.includes("precio"));
  if (!colCodigo && !colId) return { lineas: [], errores: ["No se encontró una columna de Id o Código del Producto."] };

  // Reúne referencias y resuelve todos los productos en una sola consulta.
  const val = (fila: Record<string, unknown>, col?: string) => (col ? fila[col] : null);
  const codigos = new Set<string>();
  const ids = new Set<number>();
  for (const f of filas) {
    const cod = val(f, colCodigo);
    const id = val(f, colId);
    if (cod != null && String(cod).trim()) codigos.add(String(cod).trim());
    if (id != null && Number.isInteger(Number(id))) ids.add(Number(id));
  }
  const productos = await db.producto.findMany({
    where: { activo: true, habilitadoVenta: true, OR: [{ codigo: { in: [...codigos] } }, { id: { in: [...ids] } }] },
    select: { id: true, codigo: true, precioVenta: true },
  });
  const porCodigo = new Map(productos.map((p) => [p.codigo, p]));
  const porId = new Map(productos.map((p) => [p.id, p]));

  const lineas: ItemImportado[] = [];
  const errores: string[] = [];
  filas.forEach((f, i) => {
    const cod = val(f, colCodigo);
    const id = val(f, colId);
    const ref = cod != null && String(cod).trim() ? String(cod).trim() : id != null ? String(id).trim() : "";
    if (!ref) return; // fila vacía, se ignora
    const prod =
      (cod != null && String(cod).trim() && porCodigo.get(String(cod).trim())) ||
      (id != null && porId.get(Number(id))) ||
      undefined;
    if (!prod) {
      errores.push(`Fila ${i + 2}: no se encontró un producto de venta con "${ref}".`);
      return;
    }
    const cantidad = Number(val(f, colCant));
    const precioRaw = val(f, colPrecio);
    lineas.push({
      productoId: prod.id,
      cantidad: cantidad > 0 ? cantidad : 1,
      precio: precioRaw != null && Number(precioRaw) >= 0 ? Number(precioRaw) : toNum(prod.precioVenta),
    });
  });

  if (lineas.length === 0 && errores.length === 0) errores.push("No se encontraron ítems válidos en la planilla.");
  return { lineas, errores };
}

export async function eliminarBorrador(id: number, _: ActionState): Promise<ActionState> {
  try {
    const { db } = await getTenant("ventas");
    const antes = await db.factura.findUnique({ where: { id }, include: { lineas: true } });
    const r = await db.factura.deleteMany({ where: { id, estado: "BORRADOR" } });
    if (r.count === 0) throw new ErrorNegocio("Solo se pueden eliminar borradores");
    await auditar({ modulo: "ventas", entidad: "Factura", entidadId: id, accion: "ELIMINAR", resumen: `Eliminó el borrador de factura #${id}`, antes });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/ventas/facturas");
  redirect("/ventas/facturas");
}
