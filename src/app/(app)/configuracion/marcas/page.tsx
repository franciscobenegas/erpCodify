import { getTenant } from "@/lib/auth";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearMarca, crearModelo } from "./actions";

export const metadata = { title: "Marcas y modelos" };

export default async function MarcasPage() {
  const { db } = await getTenant("configuracion");
  const [marcas, modelos] = await Promise.all([
    db.marca.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { productos: true } } } }),
    db.modeloProducto.findMany({ orderBy: { nombre: "asc" }, include: { marca: true, _count: { select: { productos: true } } } }),
  ]);

  return (
    <>
      <PageHeader title="Marcas y modelos" description="Catálogo de marcas y modelos de productos" />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Marcas */}
        <div className="grid h-fit gap-4">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Marcas</CardTitle></CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Productos</TableHead></TableRow></TableHeader>
              <TableBody>
                {marcas.length === 0 && <EmptyRow cols={2}>Todavía no hay marcas.</EmptyRow>}
                {marcas.map((m) => (
                  <TableRow key={m.id}><TableCell className="font-medium">{m.nombre}</TableCell><TableCell className="text-right">{m._count.productos}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Nueva marca</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={crearMarca} className="flex gap-2">
                <Input name="nombre" placeholder="Nombre" required />
                <SubmitButton>Crear</SubmitButton>
                <Button type="reset" variant="ghost">Cancelar</Button>
              </ActionForm>
            </CardContent>
          </Card>
        </div>

        {/* Modelos */}
        <div className="grid h-fit gap-4">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Modelos</CardTitle></CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Marca</TableHead><TableHead className="text-right">Productos</TableHead></TableRow></TableHeader>
              <TableBody>
                {modelos.length === 0 && <EmptyRow cols={3}>Todavía no hay modelos.</EmptyRow>}
                {modelos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{m.marca?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-right">{m._count.productos}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Nuevo modelo</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={crearModelo} className="grid gap-3">
                <Field label="Nombre"><Input name="nombre" placeholder="Nombre del modelo" required /></Field>
                <Field label="Marca">
                  <NativeSelect name="marcaId" defaultValue="">
                    <option value="">Sin marca</option>
                    {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </NativeSelect>
                </Field>
                <div><SubmitButton>Crear modelo</SubmitButton></div>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
