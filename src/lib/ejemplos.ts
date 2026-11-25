import "server-only";
import { Prisma, OrigenMovimiento } from "@prisma/client";

/**
 * Carga datos de ejemplo para una empresa recién creada: un depósito, categorías,
 * 3 productos (con stock inicial y su movimiento), 2 clientes y un proveedor.
 * Pensado para correr dentro de la transacción que da de alta la empresa.
 */
export async function sembrarEjemplos(tx: Prisma.TransactionClient, empresaId: number) {
  const deposito = await tx.deposito.create({
    data: { empresaId, nombre: "Depósito Central", direccion: "Casa matriz" },
  });

  const bebidas = await tx.categoria.create({ data: { empresaId, nombre: "Bebidas" } });
  const almacen = await tx.categoria.create({ data: { empresaId, nombre: "Almacén" } });
  const limpieza = await tx.categoria.create({ data: { empresaId, nombre: "Limpieza" } });

  // Catálogos de configuración con valores de uso común.
  await tx.unidadMedida.createMany({
    data: [
      { empresaId, codigo: "UN", nombre: "Unidad", decimales: 0, factor: 1 },
      { empresaId, codigo: "KG", nombre: "Kilogramo", decimales: 3, factor: 1 },
      { empresaId, codigo: "LT", nombre: "Litro", decimales: 3, factor: 1 },
      { empresaId, codigo: "CJA", nombre: "Caja (12 un.)", decimales: 0, factor: 12 },
    ],
  });
  // Cuentas de caja/banco con saldo y movimientos de ejemplo, y formas de pago
  // ligadas a su cuenta destino (Efectivo→Caja, Transferencia→Banco).
  const caja = await tx.cuentaFinanciera.create({ data: { empresaId, nombre: "Caja", tipo: "CAJA", saldoInicial: 500000, saldo: 680000 } });
  const banco = await tx.cuentaFinanciera.create({ data: { empresaId, nombre: "Banco Itaú", tipo: "BANCO", saldoInicial: 5000000, saldo: 6500000 } });
  await tx.movimientoCaja.create({ data: { empresaId, cuentaId: caja.id, tipo: "INGRESO", monto: 300000, concepto: "Venta de mostrador", origen: "COBRO" } });
  await tx.movimientoCaja.create({ data: { empresaId, cuentaId: caja.id, tipo: "EGRESO", monto: 120000, concepto: "Pago de alquiler", origen: "GASTO" } });
  await tx.movimientoCaja.create({ data: { empresaId, cuentaId: banco.id, tipo: "INGRESO", monto: 1500000, concepto: "Transferencia de cliente", origen: "COBRO" } });
  await tx.formaPago.create({ data: { empresaId, nombre: "Efectivo", cuentaId: caja.id } });
  await tx.formaPago.create({ data: { empresaId, nombre: "Transferencia", cuentaId: banco.id } });
  await tx.formaPago.createMany({ data: ["Cheque", "Tarjeta"].map((nombre) => ({ empresaId, nombre })) });
  await tx.cuentaGasto.createMany({
    data: ["Alquiler", "Servicios básicos", "Sueldos", "Impuestos", "Fletes"].map((nombre) => ({ empresaId, nombre })),
  });
  await tx.centroCosto.createMany({
    data: ["Administración", "Ventas", "Depósito"].map((nombre) => ({ empresaId, nombre })),
  });

  const defs = [
    { codigo: "BEB-001", nombre: "Agua mineral 2L", categoriaId: bebidas.id, codigoBarras: "7840001000019", precioVenta: 7000, costo: 4500, tasaIva: 10, stock: 50 },
    { codigo: "ALM-001", nombre: "Arroz 1kg", categoriaId: almacen.id, codigoBarras: "7840001000026", precioVenta: 9500, costo: 6800, tasaIva: 5, stock: 80 },
    { codigo: "LIM-001", nombre: "Detergente 750ml", categoriaId: limpieza.id, precioVenta: 11000, costo: 7200, tasaIva: 10, stock: 30 },
  ];

  const prods: { id: number; stock: number }[] = [];
  for (const { stock, ...p } of defs) {
    const prod = await tx.producto.create({ data: { empresaId, ...p, stockMinimo: 10 } });
    prods.push({ id: prod.id, stock });
  }

  // Ejemplos de unidad alternativa (Agua: caja de 12) y precio por cantidad (Arroz mayorista).
  await tx.productoUnidad.create({ data: { empresaId, productoId: prods[0].id, nombre: "Caja (12)", factor: 12 } });
  await tx.productoPrecio.createMany({
    data: [
      { empresaId, productoId: prods[1].id, cantidadMin: 10, precio: 9000 },
      { empresaId, productoId: prods[1].id, cantidadMin: 50, precio: 8500 },
    ],
  });

  await tx.stock.createMany({
    data: prods.map((x) => ({ empresaId, productoId: x.id, depositoId: deposito.id, cantidad: x.stock })),
  });
  await tx.movimientoStock.createMany({
    data: prods.map((x) => ({
      empresaId,
      productoId: x.id,
      depositoId: deposito.id,
      cantidad: x.stock,
      origen: OrigenMovimiento.AJUSTE,
      nota: "Inventario inicial",
    })),
  });

  await tx.contacto.createMany({
    data: [
      { empresaId, nombre: "Cliente Ocasional", ruc: "44444401-7", esCliente: true },
      { empresaId, nombre: "Supermercado El Sol S.R.L.", ruc: "80012345-6", telefono: "0981 111 222", esCliente: true },
      { empresaId, nombre: "Distribuidora Guaraní S.A.", ruc: "80098765-4", telefono: "021 555 444", esProveedor: true },
    ],
  });

  // Sucursal + punto de venta iniciales, con el timbrado FACTURA copiado del
  // placeholder de la empresa. El admin los completa en Configuración.
  const emp = await tx.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { timbrado: true, timbradoInicio: true, timbradoFin: true, establecimiento: true, puntoExpedicion: true, siguienteNumero: true },
  });
  const sucursal = await tx.sucursal.create({
    data: { empresaId, nombre: "Casa Matriz", establecimiento: emp.establecimiento, direccion: "Casa matriz" },
  });
  const punto = await tx.puntoVenta.create({
    data: { empresaId, sucursalId: sucursal.id, nombre: "Caja 1", puntoExpedicion: emp.puntoExpedicion },
  });
  await tx.timbradoComprobante.create({
    data: {
      empresaId,
      puntoVentaId: punto.id,
      tipo: "FACTURA",
      timbrado: emp.timbrado,
      timbradoInicio: emp.timbradoInicio,
      timbradoFin: emp.timbradoFin,
      siguienteNumero: emp.siguienteNumero,
    },
  });
}
