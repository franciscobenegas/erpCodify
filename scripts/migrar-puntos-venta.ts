/**
 * Migración puntual (#5): crea una sucursal "Casa Matriz" y un punto de venta
 * "Caja 1" por empresa, y repunta hacia ellos los timbrados y las facturas
 * existentes. El establecimiento/punto de expedición se toman del timbrado
 * FACTURA actual. Idempotente. Correr con: npx tsx scripts/migrar-puntos-venta.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const empresas = await prisma.empresa.findMany();
  for (const e of empresas) {
    const facturaTimb = await prisma.timbradoComprobante.findFirst({
      where: { empresaId: e.id, tipo: "FACTURA" },
    });
    const establecimiento = facturaTimb?.establecimiento ?? "001";
    const puntoExpedicion = facturaTimb?.puntoExpedicion ?? "001";

    const sucursal = await prisma.sucursal.upsert({
      where: { empresaId_nombre: { empresaId: e.id, nombre: "Casa Matriz" } },
      update: {},
      create: { empresaId: e.id, nombre: "Casa Matriz", establecimiento, direccion: e.direccion ?? undefined },
    });
    const punto = await prisma.puntoVenta.upsert({
      where: { empresaId_nombre: { empresaId: e.id, nombre: "Caja 1" } },
      update: {},
      create: { empresaId: e.id, sucursalId: sucursal.id, nombre: "Caja 1", puntoExpedicion },
    });

    const t = await prisma.timbradoComprobante.updateMany({
      where: { empresaId: e.id, puntoVentaId: null },
      data: { puntoVentaId: punto.id },
    });
    const f = await prisma.factura.updateMany({
      where: { empresaId: e.id, puntoVentaId: null },
      data: { puntoVentaId: punto.id },
    });
    console.log(`✔ Empresa #${e.id} (${e.razonSocial}): Casa Matriz/${establecimiento} · Caja 1/${puntoExpedicion} — ${t.count} timbrado(s), ${f.count} factura(s) repuntadas`);
  }
  console.log(`\nListo. ${empresas.length} empresa(s) migrada(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
