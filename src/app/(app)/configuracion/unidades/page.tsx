import { getTenant } from "@/lib/auth";
import { formatQty } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearUnidad } from "./actions";

export const metadata = { title: "Unidades de medida" };

export default async function UnidadesPage() {
  const { db } = await getTenant("configuracion");
  const unidades = await db.unidadMedida.findMany({ orderBy: { codigo: "asc" } });

  return (
    <>
      <PageHeader title="Unidades de medida" description="Catálogo de unidades y su factor de conversión a la unidad base" />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead><TableHead>Nombre</TableHead>
                <TableHead className="text-right">Decimales</TableHead><TableHead className="text-right">Factor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.length === 0 && <EmptyRow cols={4}>Todavía no hay unidades.</EmptyRow>}
              {unidades.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono font-medium">{u.codigo}</TableCell>
                  <TableCell>{u.nombre}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{u.decimales}</TableCell>
                  <TableCell className="text-right">{formatQty(u.factor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Nueva unidad</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={crearUnidad} className="grid gap-3">
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <Field label="Código"><Input name="codigo" placeholder="UN" required /></Field>
                <Field label="Nombre"><Input name="nombre" placeholder="Unidad" required /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Decimales" hint="0 a 4"><Input name="decimales" type="number" min={0} max={4} defaultValue={0} /></Field>
                <Field label="Factor" hint="Equivale a N base (ej. caja = 12)"><Input name="factor" type="number" min={0} step="any" defaultValue={1} /></Field>
              </div>
              <div><SubmitButton>Crear unidad</SubmitButton></div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
