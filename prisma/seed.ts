import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // La empresa es el tenant: se crea primero y todo cuelga de ella.
  const hoy = new Date();
  const empresa = await prisma.empresa.upsert({
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
  const empresaId = empresa.id;

  // Timbrado inicial para FACTURA (cada tipo de comprobante lleva su propia numeración).
  await prisma.timbradoComprobante.upsert({
    where: { empresaId_tipo: { empresaId, tipo: "FACTURA" } },
    update: {},
    create: {
      empresaId,
      tipo: "FACTURA",
      timbrado: empresa.timbrado,
      timbradoInicio: empresa.timbradoInicio,
      timbradoFin: empresa.timbradoFin,
      establecimiento: empresa.establecimiento,
      puntoExpedicion: empresa.puntoExpedicion,
      siguienteNumero: empresa.siguienteNumero,
    },
  });

  const admin = await prisma.rol.upsert({
    where: { empresaId_nombre: { empresaId, nombre: "Administrador" } },
    update: {},
    create: { empresaId, nombre: "Administrador", permisos: ["inventario", "ventas", "compras", "finanzas", "configuracion"] },
  });
  await prisma.rol.upsert({
    where: { empresaId_nombre: { empresaId, nombre: "Vendedor" } },
    update: {},
    create: { empresaId, nombre: "Vendedor", permisos: ["ventas"] },
  });
  await prisma.rol.upsert({
    where: { empresaId_nombre: { empresaId, nombre: "Depósito" } },
    update: {},
    create: { empresaId, nombre: "Depósito", permisos: ["inventario", "compras"] },
  });

  // El primer usuario es super-admin para poder dar de alta nuevas empresas.
  await prisma.usuario.upsert({
    where: { email: "admin@erp.local" },
    update: {},
    create: {
      empresaId,
      nombre: "Administrador",
      email: "admin@erp.local",
      passwordHash: await bcrypt.hash("admin123", 10),
      rolId: admin.id,
      esSuperAdmin: true,
    },
  });

  const central = await prisma.deposito.upsert({
    where: { empresaId_nombre: { empresaId, nombre: "Depósito Central" } },
    update: {},
    create: { empresaId, nombre: "Depósito Central", direccion: "Casa matriz" },
  });
  await prisma.deposito.upsert({
    where: { empresaId_nombre: { empresaId, nombre: "Sucursal 1" } },
    update: {},
    create: { empresaId, nombre: "Sucursal 1" },
  });

  const cats = await Promise.all(
    ["Bebidas", "Almacén", "Limpieza"].map((nombre) =>
      prisma.categoria.upsert({ where: { empresaId_nombre: { empresaId, nombre } }, update: {}, create: { empresaId, nombre } }),
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
      where: { empresaId_codigo: { empresaId, codigo: p.codigo } },
      update: {},
      create: { ...p, empresaId, stockMinimo: 10 },
    });
    const existe = await prisma.stock.findUnique({
      where: { productoId_depositoId: { productoId: prod.id, depositoId: central.id } },
    });
    if (!existe) {
      await prisma.stock.create({ data: { empresaId, productoId: prod.id, depositoId: central.id, cantidad: stock } });
      await prisma.movimientoStock.create({
        data: { empresaId, productoId: prod.id, depositoId: central.id, cantidad: stock, origen: "AJUSTE", nota: "Inventario inicial" },
      });
    }
  }

  if ((await prisma.contacto.count({ where: { empresaId } })) === 0) {
    await prisma.contacto.createMany({
      data: [
        { empresaId, nombre: "Cliente Ocasional", ruc: "44444401-7", esCliente: true },
        { empresaId, nombre: "Supermercado El Sol S.R.L.", ruc: "80012345-6", telefono: "0981 111 222", esCliente: true },
        { empresaId, nombre: "Distribuidora Guaraní S.A.", ruc: "80098765-4", telefono: "021 555 444", esProveedor: true },
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
