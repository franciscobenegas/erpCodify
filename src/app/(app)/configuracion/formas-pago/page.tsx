import { getTenant } from "@/lib/auth";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/form";
import { AccionBoton } from "@/components/accion-boton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearFormaPago, alternarFormaPago } from "./actions";
import { CuentaSelect } from "./cuenta-select";

export const metadata = { title: "Formas de pago" };

export default async function FormasPagoPage() {
  const { db } = await getTenant("configuracion");
  const [formas, cuentas] = await Promise.all([
    db.formaPago.findMany({ orderBy: { nombre: "asc" } }),
    db.cuentaFinanciera.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return (
    <>
      <PageHeader title="Formas de pago" description="Medios de pago disponibles en ventas, cobranzas y pagos" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nombre</TableHead><TableHead>Cuenta destino</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {formas.length === 0 && <EmptyRow cols={4}>Todavía no hay formas de pago.</EmptyRow>}
              {formas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell><CuentaSelect formaId={f.id} cuentaId={f.cuentaId} cuentas={cuentas} /></TableCell>
                  <TableCell>{f.activo ? <Badge variant="secondary">Activa</Badge> : <Badge variant="outline">Inactiva</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <AccionBoton action={alternarFormaPago.bind(null, f.id)} variant="ghost">
                      {f.activo ? "Desactivar" : "Activar"}
                    </AccionBoton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Nueva forma de pago</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={crearFormaPago} className="grid gap-2">
              <Input name="nombre" placeholder="Efectivo, Transferencia…" required />
              <NativeSelect name="cuentaId" defaultValue="">
                <option value="">— Sin cuenta destino —</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </NativeSelect>
              <div className="flex gap-2">
                <SubmitButton>Crear</SubmitButton>
                <Button type="reset" variant="ghost">Cancelar</Button>
              </div>
            </ActionForm>
            <p className="mt-3 text-xs text-muted-foreground">La cuenta destino es a dónde ingresa el dinero cobrado con ese medio en una venta al contado. Sin cuenta, el medio no puede usarse para cobrar una venta.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
