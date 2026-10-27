import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { FacturaPDF } from "@/lib/factura-pdf";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s?.permisos.includes("ventas")) return new Response("No autorizado", { status: 403 });

  const { id } = await params;
  const [factura, empresa] = await Promise.all([
    prisma.factura.findUnique({ where: { id: Number(id) }, include: { cliente: true, lineas: { orderBy: { id: "asc" } } } }),
    prisma.empresa.findUnique({ where: { id: 1 } }),
  ]);
  if (!factura || !empresa) return new Response("No encontrada", { status: 404 });
  if (factura.estado === "BORRADOR") return new Response("La factura todavía no fue emitida", { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await renderToBuffer(createElement(FacturaPDF, { empresa, factura }) as any);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factura-${factura.numero}.pdf"`,
    },
  });
}
