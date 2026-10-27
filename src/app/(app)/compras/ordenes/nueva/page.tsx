import { PageHeader } from "@/components/page-header";
import { OrdenForm } from "../orden-form";

export const metadata = { title: "Nueva orden de compra" };

export default function NuevaOrdenPage() {
  return (
    <>
      <PageHeader title="Nueva orden de compra" description="El stock ingresa recién cuando se marca la orden como recibida." />
      <OrdenForm />
    </>
  );
}
