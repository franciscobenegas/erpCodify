import { getTenant } from "@/lib/auth";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { AccionBoton } from "@/components/accion-boton";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearSucursal, toggleSucursal, crearPuntoVenta, togglePuntoVenta } from "./actions";

export const metadata = { title: "Sucursales y puntos de venta" };

export default async function PuntosVentaPage() {
  const { db } = await getTenant("configuracion");
  const [sucursales, puntos] = await Promise.all([
    db.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    db.puntoVenta.findMany({ orderBy: { nombre: "asc" }, include: { sucursal: { select: { nombre: true } } } }),
  ]);
  const sucursalesActivas = sucursales.filter((s) => s.activo);

  return (
    <>
      <PageHeader title="Sucursales y puntos de venta" description="El establecimiento (sucursal) y el punto de expedición (caja) forman el número de comprobante." />

      <div className="grid gap-8">
        {/* Sucursales */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle className="text-base">Sucursales</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nombre</TableHead><TableHead>Establecimiento</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {sucursales.length === 0 && <EmptyRow cols={4}>Todavía no hay sucursales.</EmptyRow>}
                {sucursales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="font-mono">{s.establecimiento}</TableCell>
                    <TableCell>{s.activo ? <Badge variant="secondary">Activa</Badge> : <Badge variant="outline">Inactiva</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <AccionBoton action={toggleSucursal.bind(null, s.id)} variant="ghost">{s.activo ? "Desactivar" : "Activar"}</AccionBoton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Nueva sucursal</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={crearSucursal} className="grid gap-3">
                <Field label="Nombre"><Input name="nombre" placeholder="Casa Matriz" required /></Field>
                <Field label="Establecimiento" hint="3 dígitos, ej. 001"><Input name="establecimiento" defaultValue="001" required /></Field>
                <Field label="Dirección"><Input name="direccion" /></Field>
                <div><SubmitButton>Crear sucursal</SubmitButton></div>
              </ActionForm>
            </CardContent>
          </Card>
        </div>

        {/* Puntos de venta */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle className="text-base">Puntos de venta</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nombre</TableHead><TableHead>Sucursal</TableHead><TableHead>Punto exp.</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {puntos.length === 0 && <EmptyRow cols={5}>Todavía no hay puntos de venta.</EmptyRow>}
                {puntos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sucursal.nombre}</TableCell>
                    <TableCell className="font-mono">{p.puntoExpedicion}</TableCell>
                    <TableCell>{p.activo ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <AccionBoton action={togglePuntoVenta.bind(null, p.id)} variant="ghost">{p.activo ? "Desactivar" : "Activar"}</AccionBoton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Nuevo punto de venta</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={crearPuntoVenta} className="grid gap-3">
                <Field label="Nombre"><Input name="nombre" placeholder="Caja 1" required /></Field>
                <Field label="Sucursal">
                  <NativeSelect name="sucursalId" defaultValue={sucursalesActivas[0]?.id} required>
                    {sucursalesActivas.length === 0 && <option value="">Creá una sucursal primero</option>}
                    {sucursalesActivas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Punto de expedición" hint="3 dígitos, ej. 001"><Input name="puntoExpedicion" defaultValue="001" required /></Field>
                <div><SubmitButton disabled={sucursalesActivas.length === 0}>Crear punto de venta</SubmitButton></div>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
