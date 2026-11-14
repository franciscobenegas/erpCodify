import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTenant } from "@/lib/auth";
import { formatFecha, formatGs, formatQty } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { AccionBoton } from "@/components/accion-boton";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cancelarOrden, confirmarOrden, recibirOrden } from "../actions";

export default async function OrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await getTenant();
  const o = await db.ordenCompra.findUnique({
    where: { id: Number(id) },
    include: { proveedor: true, deposito: true, usuario: true, lineas: { include: { producto: true }, orderBy: { id: "asc" } } },
  });
  if (!o) notFound();

  return (
    <>
      <PageHeader
        title={`Orden de compra #${o.id}`}
        description={<span className="flex items-center gap-2"><EstadoBadge estado={o.estado} /> {formatFecha(o.fecha)}</span>}
        actions={
          <>
            {o.estado === "BORRADOR" && (
              <>
                <Button variant="outline" asChild><Link href={`/compras/ordenes/${o.id}/editar`}><Pencil /> Editar</Link></Button>
                <AccionBoton action={confirmarOrden.bind(null, o.id)}>Confirmar</AccionBoton>
              </>
            )}
            {(o.estado === "BORRADOR" || o.estado === "CONFIRMADA") && (
              <AccionBoton action={cancelarOrden.bind(null, o.id)} variant="ghost" confirm="¿Cancelar la orden?">Cancelar orden</AccionBoton>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead><TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell><div className="font-medium">{l.producto.nombre}</div><div className="font-mono text-xs text-muted-foreground">{l.producto.codigo}</div></TableCell>
                  <TableCell className="text-right">{formatQty(l.cantidad)} {l.producto.unidad}</TableCell>
                  <TableCell className="text-right">{formatGs(l.costo)}</TableCell>
                  <TableCell className="text-right font-medium">{formatGs(l.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow><TableCell colSpan={3}>Total</TableCell><TableCell className="text-right">{formatGs(o.total)}</TableCell></TableRow>
            </TableFooter>
          </Table>
        </Card>

        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader><CardTitle>Proveedor</CardTitle></CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <div className="font-medium">{o.proveedor.nombre}</div>
              <div className="text-muted-foreground">RUC {o.proveedor.ruc ?? "—"}</div>
              <div className="mt-2 text-muted-foreground">Recibe en: {o.deposito.nombre}</div>
              {o.facturaProveedor && <div className="text-muted-foreground">Factura proveedor: {o.facturaProveedor}</div>}
              {o.recibidaAt && <div className="text-muted-foreground">Recibida el {formatFecha(o.recibidaAt)}</div>}
              {o.observacion && <div className="mt-2">{o.observacion}</div>}
            </CardContent>
          </Card>

          {o.estado === "CONFIRMADA" && (
            <Card>
              <CardHeader><CardTitle>Recibir mercadería</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={recibirOrden.bind(null, o.id)} className="grid gap-3" confirm="¿Confirmar la recepción? Se ingresa el stock y se actualizan los costos.">
                  <Field label="N° factura del proveedor (opcional)"><Input name="facturaProveedor" placeholder="001-001-0001234" /></Field>
                  <div><SubmitButton>Marcar como recibida</SubmitButton></div>
                </ActionForm>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
