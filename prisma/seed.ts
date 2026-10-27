import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.rol.upsert({
    where: { nombre: "Administrador" },
    update: {},
    create: { nombre: "Administrador", permisos: ["inventario", "ventas", "compras", "configuracion"] },
  });
  await prisma.rol.upsert({
    where: { nombre: "Vendedor" },
    update: {},
    create: { nombre: "Vendedor", permisos: ["ventas"] },
  });
  await prisma.rol.upsert({
    where: { nombre: "Depósito" },
    update: {},
    create: { nombre: "Depósito", permisos: ["inventario", "compras"] },
  });

  await prisma.usuario.upsert({
    where: { email: "admin@erp.local" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@erp.local",
      passwordHash: await bcrypt.hash("admin123", 10),
      rolId: admin.id,
    },
  });

  const hoy = new Date();
  await prisma.empresa.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      razonSocial: "Mi Empresa S.A.",
      ruc: "80000000-1",
      direccion: "Asunción, Paraguay",
      telefono: "021 000 000",
      timbrado: "12345678",
      timbradoInicio: new Date(Date.UTC(hoy.getFullYear(), 0, 1)),
      timbradoFin: new Date(Date.UTC(hoy.getFullYear(), 11, 31)),
    },
  });

  const central = await prisma.deposito.upsert({
    where: { nombre: "Depósito Central" },
    update: {},
    create: { nombre: "Depósito Central", direccion: "Casa matriz" },
  });
  await prisma.deposito.upsert({
    where: { nombre: "Sucursal 1" },
    update: {},
    create: { nombre: "Sucursal 1" },
  });

  const cats = await Promise.all(
    ["Bebidas", "Almacén", "Limpieza"].map((nombre) =>
      prisma.categoria.upsert({ where: { nombre }, update: {}, create: { nombre } }),
    ),
  );

  const productos = [
    { codigo: "BEB-001", nombre: "Agua mineral 2L", categoriaId: cats[0].id, precioVenta: 7000, costo: 4500, tasaIva: 10, stock: 120 },
    { codigo: "BEB-002", nombre: "Gaseosa cola 2L", categoriaId: cats[0].id, precioVenta: 12500, costo: 8900, tasaIva: 10, stock: 80 },
    { codigo: "ALM-001", nombre: "Arroz 1kg", categoriaId: cats[1].id, precioVenta: 9500, costo: 6800, tasaIva: 5, stock: 200 },
    { codigo: "ALM-002", nombre: "Yerba mate 500g", categoriaId: cats[1].id, precioVenta: 18000, costo: 13000, tasaIva: 5, stock: 60 },
    { codigo: "LIM-001", nombre: "Detergente 750ml", categoriaId: cats[2].id, precioVenta: 11000, costo: 7200, tasaIva: 10, stock: 4 },
  ];

  for (const { stock, ...p } of productos) {
    const prod = await prisma.producto.upsert({
      where: { codigo: p.codigo },
      update: {},
      create: { ...p, stockMinimo: 10 },
    });
    const existe = await prisma.stock.findUnique({
      where: { productoId_depositoId: { productoId: prod.id, depositoId: central.id } },
    });
    if (!existe) {
      await prisma.stock.create({ data: { productoId: prod.id, depositoId: central.id, cantidad: stock } });
      await prisma.movimientoStock.create({
        data: { productoId: prod.id, depositoId: central.id, cantidad: stock, origen: "AJUSTE", nota: "Inventario inicial" },
      });
    }
  }

  if ((await prisma.contacto.count()) === 0) {
    await prisma.contacto.createMany({
      data: [
        { nombre: "Cliente Ocasional", ruc: "44444401-7", esCliente: true },
        { nombre: "Supermercado El Sol S.R.L.", ruc: "80012345-6", telefono: "0981 111 222", esCliente: true },
        { nombre: "Distribuidora Guaraní S.A.", ruc: "80098765-4", telefono: "021 555 444", esProveedor: true },
      ],
    });
  }

  console.log("Seed listo. Usuario: admin@erp.local / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
