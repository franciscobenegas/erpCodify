import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Pencil } from "lucide-react";
import { getTenant } from "@/lib/auth";
import { formatFecha, formatGs, formatQty } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { AccionBoton } from "@/components/accion-boton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { anularFactura, eliminarBorrador, emitirFactura } from "../actions";

export default async function FacturaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { db } = await getTenant();
  const f = await db.factura.findUnique({
    where: { id: Number(id) },
    include: { cliente: true, deposito: true, usuario: true, lineas: { include: { producto: true }, orderBy: { id: "asc" } } },
  });
  if (!f) notFound();

  return (
    <>
      <PageHeader
        title={f.numero ? `Factura ${f.numero}` : `Borrador #${f.id}`}
        description={<span className="flex items-center gap-2"><EstadoBadge estado={f.estado} /> {formatFecha(f.fecha)} · {f.condicion === "CONTADO" ? "Contado" : "Crédito"}</span>}
        actions={
          <>
            {f.estado === "BORRADOR" && (
              <>
                <Button variant="outline" asChild><Link href={`/ventas/facturas/${f.id}/editar`}><Pencil /> Editar</Link></Button>
                <AccionBoton action={emitirFactura.bind(null, f.id)} confirm="¿Emitir la factura? Se asigna número y se descuenta stock.">Emitir</AccionBoton>
                <AccionBoton action={eliminarBorrador.bind(null, f.id)} variant="ghost" confirm="¿Eliminar este borrador?">Eliminar</AccionBoton>
              </>
            )}
            {f.estado !== "BORRADOR" && (
              <Button variant="outline" asChild>
                <a href={`/ventas/facturas/${f.id}/pdf`} target="_blank" rel="noopener"><FileDown /> PDF</a>
              </Button>
            )}
            {f.estado === "EMITIDA" && (
              <AccionBoton action={anularFactura.bind(null, f.id)} variant="destructive" confirm="¿Anular la factura? Se repone el stock y no se puede deshacer.">
                Anular
              </AccionBoton>
            )}
          </>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          El borrador se guardó pero no se pudo emitir: {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead><TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Precio</TableHead><TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {f.lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell><div className="font-medium">{l.descripcion}</div><div className="font-mono text-xs text-muted-foreground">{l.producto.codigo}</div></TableCell>
                  <TableCell className="text-right">{formatQty(l.cantidad)}</TableCell>
                  <TableCell className="text-right">{formatGs(l.precioUnitario)}</TableCell>
                  <TableCell className="text-right">{l.tasaIva === 0 ? "Ex." : `${l.tasaIva}%`}</TableCell>
                  <TableCell className="text-right font-medium">{formatGs(l.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <div className="font-medium">{f.cliente.nombre}</div>
              <div className="text-muted-foreground">RUC {f.cliente.ruc ?? "—"}</div>
              {f.cliente.direccion && <div className="text-muted-foreground">{f.cliente.direccion}</div>}
              <div className="mt-2 text-muted-foreground">Depósito: {f.deposito.nombre}</div>
              {f.usuario && <div className="text-muted-foreground">Cargada por: {f.usuario.nombre}</div>}
              {f.observacion && <div className="mt-2">{f.observacion}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Totales</CardTitle></CardHeader>
            <CardContent className="grid gap-1 text-sm">
              {([
                ["Exentas", f.exenta], ["Gravadas 5%", f.gravada5], ["Gravadas 10%", f.gravada10],
                ["Liquidación IVA 5%", f.iva5], ["Liquidación IVA 10%", f.iva10],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{formatGs(v)}</span></div>
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatGs(f.total)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
