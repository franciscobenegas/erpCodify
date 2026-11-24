import Link from "next/link";
import { getTenant } from "@/lib/auth";
import { TIPOS_COMPROBANTE } from "@/lib/comprobante";
import { PageHeader } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { guardarTimbrado } from "./actions";

export const metadata = { title: "Timbrados" };

const iso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");

export default async function TimbradosPage({ searchParams }: { searchParams: Promise<{ punto?: string }> }) {
  const { punto } = await searchParams;
  const { db } = await getTenant("configuracion");
  const puntos = await db.puntoVenta.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, include: { sucursal: { select: { nombre: true, establecimiento: true } } } });

  if (puntos.length === 0) {
    return (
      <>
        <PageHeader title="Timbrados por comprobante" description="Cada punto de venta y tipo de comprobante lleva su propio timbrado y numeración." />
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Primero creá una sucursal y un punto de venta en{" "}
          <Link href="/configuracion/puntos-venta" className="font-medium underline">Sucursales y puntos de venta</Link>.
        </CardContent></Card>
      </>
    );
  }

  const sel = puntos.find((p) => p.id === Number(punto)) ?? puntos[0];
  const timbrados = await db.timbradoComprobante.findMany({ where: { puntoVentaId: sel.id } });
  const porTipo = new Map(timbrados.map((t) => [t.tipo, t]));

  return (
    <>
      <PageHeader title="Timbrados por comprobante" description="Cada punto de venta y tipo de comprobante lleva su propio timbrado y numeración (exigencia de la SET)." />

      {/* Selector de punto de venta */}
      <div className="mb-6 flex flex-wrap gap-2">
        {puntos.map((p) => (
          <Link
            key={p.id}
            href={`/configuracion/timbrados?punto=${p.id}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              p.id === sel.id ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted",
            )}
          >
            {p.sucursal.nombre} · {p.nombre}
            <span className="ml-1 font-mono text-xs text-muted-foreground">{p.sucursal.establecimiento}-{p.puntoExpedicion}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {TIPOS_COMPROBANTE.map(({ tipo, label }) => {
          const t = porTipo.get(tipo);
          return (
            <Card key={tipo}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{label}</CardTitle>
                {t ? (t.activo ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>) : <Badge variant="outline">Sin configurar</Badge>}
              </CardHeader>
              <CardContent>
                <ActionForm action={guardarTimbrado.bind(null, sel.id, tipo)} className="grid gap-4">
                  <Field label="N° de timbrado"><Input name="timbrado" defaultValue={t?.timbrado ?? ""} placeholder="8 dígitos" required /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Vigencia desde"><Input name="timbradoInicio" type="date" defaultValue={iso(t?.timbradoInicio)} required /></Field>
                    <Field label="Vigencia hasta"><Input name="timbradoFin" type="date" defaultValue={iso(t?.timbradoFin)} required /></Field>
                  </div>
                  <Field label="Próximo N°"><Input name="siguienteNumero" type="number" min={1} defaultValue={t?.siguienteNumero ?? 1} required className="max-w-[10rem]" /></Field>
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
