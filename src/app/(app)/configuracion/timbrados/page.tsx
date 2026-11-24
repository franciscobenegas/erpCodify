import { getTenant } from "@/lib/auth";
import { TIPOS_COMPROBANTE } from "@/lib/comprobante";
import { PageHeader } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guardarTimbrado } from "./actions";

export const metadata = { title: "Timbrados" };

const iso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");

export default async function TimbradosPage() {
  const { s, db } = await getTenant("configuracion");
  const timbrados = await db.timbradoComprobante.findMany({ where: { empresaId: s.empresaId } });
  const porTipo = new Map(timbrados.map((t) => [t.tipo, t]));

  return (
    <>
      <PageHeader title="Timbrados por comprobante" description="Cada tipo de comprobante lleva su propio timbrado y numeración (exigencia de la SET)." />
      <div className="grid gap-6 lg:grid-cols-2">
        {TIPOS_COMPROBANTE.map(({ tipo, label }) => {
          const t = porTipo.get(tipo);
          return (
            <Card key={tipo}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{label}</CardTitle>
                {t ? (
                  t.activo ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>
                ) : (
                  <Badge variant="outline">Sin configurar</Badge>
                )}
              </CardHeader>
              <CardContent>
                <ActionForm action={guardarTimbrado.bind(null, tipo)} className="grid gap-4">
                  <Field label="N° de timbrado"><Input name="timbrado" defaultValue={t?.timbrado ?? ""} placeholder="8 dígitos" required /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Vigencia desde"><Input name="timbradoInicio" type="date" defaultValue={iso(t?.timbradoInicio)} required /></Field>
                    <Field label="Vigencia hasta"><Input name="timbradoFin" type="date" defaultValue={iso(t?.timbradoFin)} required /></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Establecimiento"><Input name="establecimiento" defaultValue={t?.establecimiento ?? "001"} required /></Field>
                    <Field label="Punto exp."><Input name="puntoExpedicion" defaultValue={t?.puntoExpedicion ?? "001"} required /></Field>
                    <Field label="Próximo N°"><Input name="siguienteNumero" type="number" min={1} defaultValue={t?.siguienteNumero ?? 1} required /></Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="activo" defaultChecked={t?.activo ?? true} className="size-4" />
                    Habilitado para emitir
                  </label>
                  <div><SubmitButton>{t ? "Guardar" : "Cargar timbrado"}</SubmitButton></div>
                </ActionForm>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
