import { notFound, redirect } from "next/navigation";
import { getTenant } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { OrdenForm } from "../../orden-form";

export default async function EditarOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await getTenant();
  const o = await db.ordenCompra.findUnique({ where: { id: Number(id) }, include: { lineas: true } });
  if (!o) notFound();
  if (o.estado !== "BORRADOR") redirect(`/compras/ordenes/${o.id}`);
  return (
    <>
      <PageHeader title={`Editar OC #${o.id}`} />
      <OrdenForm orden={o} />
    </>
  );
}
