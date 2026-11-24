import { getTenant } from "@/lib/auth";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearCuentaGasto, crearCentroCosto } from "./actions";

export const metadata = { title: "Gastos" };

export default async function GastosPage() {
  const { db } = await getTenant("configuracion");
  const [cuentas, centros] = await Promise.all([
    db.cuentaGasto.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { movimientos: true } } } }),
    db.centroCosto.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { movimientos: true } } } }),
  ]);

  return (
    <>
      <PageHeader title="Gastos" description="Rubros de gasto y centros de costo para clasificar egresos de caja" />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cuentas de gasto */}
        <div className="grid h-fit gap-4">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Cuentas de gasto</CardTitle></CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Movimientos</TableHead></TableRow></TableHeader>
              <TableBody>
                {cuentas.length === 0 && <EmptyRow cols={2}>Todavía no hay cuentas de gasto.</EmptyRow>}
                {cuentas.map((c) => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.nombre}</TableCell><TableCell className="text-right">{c._count.movimientos}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Nueva cuenta de gasto</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={crearCuentaGasto} className="flex gap-2">
                <Input name="nombre" placeholder="Alquiler, Servicios, Sueldos…" required />
                <SubmitButton>Crear</SubmitButton>
                <Button type="reset" variant="ghost">Cancelar</Button>
              </ActionForm>
            </CardContent>
          </Card>
        </div>

        {/* Centros de costo */}
        <div className="grid h-fit gap-4">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Centros de costo</CardTitle></CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Movimientos</TableHead></TableRow></TableHeader>
              <TableBody>
                {centros.length === 0 && <EmptyRow cols={2}>Todavía no hay centros de costo.</EmptyRow>}
                {centros.map((c) => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.nombre}</TableCell><TableCell className="text-right">{c._count.movimientos}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Nuevo centro de costo</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={crearCentroCosto} className="flex gap-2">
                <Input name="nombre" placeholder="Administración, Ventas…" required />
                <SubmitButton>Crear</SubmitButton>
                <Button type="reset" variant="ghost">Cancelar</Button>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
