import { notFound, redirect } from "next/navigation";
import { getTenant } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { FacturaForm } from "../../factura-form";

export default async function EditarFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await getTenant();
  const f = await db.factura.findUnique({ where: { id: Number(id) }, include: { lineas: true, pagos: true } });
  if (!f) notFound();
  if (f.estado !== "BORRADOR") redirect(`/ventas/facturas/${f.id}`);
  return (
    <>
      <PageHeader title={`Editar borrador #${f.id}`} />
      <FacturaForm factura={f} />
    </>
  );
}
