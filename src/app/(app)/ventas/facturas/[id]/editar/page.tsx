import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { FacturaForm } from "../../factura-form";

export default async function EditarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await prisma.factura.findUnique({ where: { id: Number(id) }, include: { lineas: true } });
  if (!f) notFound();
  if (f.estado !== "BORRADOR") redirect(`/ventas/facturas/${f.id}`);
  return (
    <>
      <PageHeader title={`Editar borrador #${f.id}`} />
      <FacturaForm factura={f} />
    </>
  );
}
