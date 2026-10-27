import { PageHeader } from "@/components/page-header";
import { FacturaForm } from "../factura-form";

export const metadata = { title: "Nueva factura" };

export default function NuevaFacturaPage() {
  return (
    <>
      <PageHeader title="Nueva factura" description="Precios con IVA incluido. Al emitir se asigna número y se descuenta el stock." />
      <FacturaForm />
    </>
  );
}
