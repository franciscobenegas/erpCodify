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

  const defs = [
    { codigo: "BEB-001", nombre: "Agua mineral 2L", categoriaId: bebidas.id, precioVenta: 7000, costo: 4500, tasaIva: 10, stock: 50 },
    { codigo: "ALM-001", nombre: "Arroz 1kg", categoriaId: almacen.id, precioVenta: 9500, costo: 6800, tasaIva: 5, stock: 80 },
    { codigo: "LIM-001", nombre: "Detergente 750ml", categoriaId: limpieza.id, precioVenta: 11000, costo: 7200, tasaIva: 10, stock: 30 },
  ];

  const prods: { id: number; stock: number }[] = [];
  for (const { stock, ...p } of defs) {
    const prod = await tx.producto.create({ data: { empresaId, ...p, stockMinimo: 10 } });
    prods.push({ id: prod.id, stock });
  }

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
}
