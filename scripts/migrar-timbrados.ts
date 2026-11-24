/**
 * Migración puntual: siembra un TimbradoComprobante de tipo FACTURA por cada
 * empresa, copiando el timbrado "legacy" que vive en la propia Empresa. Idempotente.
 * Correr con:  npx tsx scripts/migrar-timbrados.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const empresas = await prisma.empresa.findMany();
  let creados = 0;
  for (const e of empresas) {
    const existe = await prisma.timbradoComprobante.findFirst({
      where: { empresaId: e.id, tipo: "FACTURA" },
    });
    if (existe) continue;
    await prisma.timbradoComprobante.create({
      data: {
        empresaId: e.id,
        tipo: "FACTURA",
        timbrado: e.timbrado,
        timbradoInicio: e.timbradoInicio,
        timbradoFin: e.timbradoFin,
        establecimiento: e.establecimiento,
        puntoExpedicion: e.puntoExpedicion,
        siguienteNumero: e.siguienteNumero,
      },
    });
    creados++;
    console.log(`✔ Empresa #${e.id} (${e.razonSocial}): timbrado FACTURA sembrado`);
  }
  console.log(`\nListo. ${creados} timbrado(s) FACTURA creado(s) de ${empresas.length} empresa(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
