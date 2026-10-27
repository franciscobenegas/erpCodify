import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { guardarEmpresa } from "./actions";

export const metadata = { title: "Empresa" };

const iso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EmpresaPage() {
  const e = await prisma.empresa.findUnique({ where: { id: 1 } });
  return (
    <>
      <PageHeader title="Empresa y timbrado" description="Datos que se imprimen en las facturas" />
      <ActionForm action={guardarEmpresa} className="grid gap-6 lg:grid-cols-2">
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
        <Card>
          <CardHeader>
            <CardTitle>Timbrado</CardTitle>
            <CardDescription>La factura no se emite si el timbrado está vencido.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="N° de timbrado"><Input name="timbrado" defaultValue={e?.timbrado} required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vigencia desde"><Input name="timbradoInicio" type="date" defaultValue={iso(e?.timbradoInicio)} required /></Field>
              <Field label="Vigencia hasta"><Input name="timbradoFin" type="date" defaultValue={iso(e?.timbradoFin)} required /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Establecimiento"><Input name="establecimiento" defaultValue={e?.establecimiento ?? "001"} required /></Field>
              <Field label="Punto exp."><Input name="puntoExpedicion" defaultValue={e?.puntoExpedicion ?? "001"} required /></Field>
              <Field label="Próximo N°"><Input name="siguienteNumero" type="number" min={1} defaultValue={e?.siguienteNumero ?? 1} required /></Field>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <SubmitButton>Guardar</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
