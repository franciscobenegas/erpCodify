import { getTenant } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guardarEmpresa } from "./actions";

export const metadata = { title: "Empresa" };

export default async function EmpresaPage() {
  const { s, db } = await getTenant("configuracion");
  const e = await db.empresa.findUnique({ where: { id: s.empresaId } });
  return (
    <>
      <PageHeader title="Empresa" description="Datos que se imprimen en los comprobantes" />
      <ActionForm action={guardarEmpresa} className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la empresa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Razón social"><Input name="razonSocial" defaultValue={e?.razonSocial} required /></Field>
            <Field label="RUC" hint="Con dígito verificador, ej. 80012345-6"><Input name="ruc" defaultValue={e?.ruc} required /></Field>
            <Field label="Dirección"><Input name="direccion" defaultValue={e?.direccion ?? ""} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono"><Input name="telefono" defaultValue={e?.telefono ?? ""} /></Field>
              <Field label="Email"><Input name="email" type="email" defaultValue={e?.email ?? ""} /></Field>
            </div>
          </CardContent>
        </Card>
        <div>
          <SubmitButton>Guardar</SubmitButton>
        </div>
      </ActionForm>
      <p className="mt-4 text-sm text-muted-foreground">
        El timbrado y la numeración se configuran por tipo de comprobante en{" "}
        <Link href="/configuracion/timbrados" className="font-medium underline">Configuración → Timbrados</Link>.
      </p>
    </>
  );
}
