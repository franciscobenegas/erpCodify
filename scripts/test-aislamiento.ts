/**
 * Test de aislamiento multi-empresa. Crea dos empresas temporales con datos,
 * verifica que el cliente scopeado (tenantDb) nunca cruza datos entre empresas,
 * y limpia todo. Correr con:  npx tsx scripts/test-aislamiento.ts
 */
import { PrismaClient } from "@prisma/client";
import { scopePrisma } from "../src/lib/tenant-scope";

const prisma = new PrismaClient();

let fallos = 0;
function check(nombre: string, ok: boolean) {
  console.log(`${ok ? "✔" : "✘"} ${nombre}`);
  if (!ok) fallos++;
}

async function crearEmpresaFixture(nombre: string) {
  const hoy = new Date();
  const e = await prisma.empresa.create({
    data: {
      razonSocial: nombre,
      ruc: "0",
      timbrado: "00000000",
      timbradoInicio: new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)),
      timbradoFin: new Date(Date.UTC(hoy.getUTCFullYear(), 11, 31)),
    },
  });
  const prod = await prisma.producto.create({
    data: { empresaId: e.id, codigo: `P-${e.id}`, nombre: `Producto de ${nombre}`, precioVenta: 1000 },
  });
  const cont = await prisma.contacto.create({
    data: { empresaId: e.id, nombre: `Cliente de ${nombre}`, esCliente: true },
  });
  return { e, prod, cont };
}

(async () => {
  const A = await crearEmpresaFixture("TEST_AISLAMIENTO_A");
  const B = await crearEmpresaFixture("TEST_AISLAMIENTO_B");
  const dbA = scopePrisma(prisma, A.e.id);
  const dbB = scopePrisma(prisma, B.e.id);

  try {
    // 1. Cada empresa ve solo su propio producto
    const prodsA = await dbA.producto.findMany();
    check("A ve exactamente su producto", prodsA.length === 1 && prodsA[0].id === A.prod.id);
    const prodsB = await dbB.producto.findMany();
    check("B ve exactamente su producto", prodsB.length === 1 && prodsB[0].id === B.prod.id);

    // 2. findUnique del id ajeno → null (clave: bloqueo cross-tenant por id)
    const ajeno = await dbA.producto.findUnique({ where: { id: B.prod.id } });
    check("A no puede leer el producto de B por id (findUnique → null)", ajeno === null);
    const propio = await dbA.producto.findUnique({ where: { id: A.prod.id } });
    check("A sí lee su propio producto por id", propio?.id === A.prod.id);

    // 3. count / contactos scopeados
    check("count de contactos de A es 1", (await dbA.contacto.count()) === 1);
    check("count de contactos de B es 1", (await dbB.contacto.count()) === 1);

    // 4. update/delete cross-tenant no afecta datos ajenos
    const upd = await dbA.producto.updateMany({ where: { id: B.prod.id }, data: { nombre: "HACKEADO" } });
    check("A no puede actualizar el producto de B (updateMany count 0)", upd.count === 0);
    const sigueB = await prisma.producto.findUnique({ where: { id: B.prod.id } });
    check("el producto de B quedó intacto", sigueB?.nombre === "Producto de TEST_AISLAMIENTO_B");

    // 5. create inyecta el empresaId correcto
    const nuevo = await dbA.contacto.create({ data: { nombre: "Nuevo de A", esCliente: true } as never });
    check("create por dbA guarda empresaId = A", (nuevo as { empresaId: number }).empresaId === A.e.id);
    await prisma.contacto.delete({ where: { id: (nuevo as { id: number }).id } });
  } finally {
    // Limpieza (orden: hijos → empresa)
    for (const X of [A, B]) {
      await prisma.contacto.deleteMany({ where: { empresaId: X.e.id } });
      await prisma.producto.deleteMany({ where: { empresaId: X.e.id } });
      await prisma.empresa.delete({ where: { id: X.e.id } });
    }
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? "\nTODOS LOS CHEQUEOS PASARON ✔" : `\n${fallos} CHEQUEO(S) FALLARON ✘`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
