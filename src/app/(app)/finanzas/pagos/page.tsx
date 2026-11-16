import Link from "next/link";
import { getTenant } from "@/lib/auth";
import { formatFecha, formatGs, toNum } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { registrarPago } from "./actions";

export const metadata = { title: "Pagos" };

const MEDIOS = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"];

export default async function PagosPage() {
  const { db } = await getTenant("finanzas");
  const [cuentas, ordenes, pagos] = await Promise.all([
    db.cuentaFinanciera.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
    db.ordenCompra.findMany({
      where: { estado: "RECIBIDA" },
      include: { proveedor: true, pagoAplicaciones: { select: { monto: true } } },
      orderBy: { fecha: "asc" },
    }),
    db.pago.findMany({ include: { proveedor: true, cuenta: true }, orderBy: { fecha: "desc" }, take: 20 }),
  ]);

  const pendientes = ordenes
    .map((o) => {
      const pagado = o.pagoAplicaciones.reduce((a, x) => a + toNum(x.monto), 0);
      return { o, total: toNum(o.total), pagado, saldo: toNum(o.total) - pagado };
    })
    .filter((x) => x.saldo > 0.5);

  const totalPorPagar = pendientes.reduce((a, x) => a + x.saldo, 0);

  const porProveedor = new Map<number, { nombre: string; saldo: number }>();
  for (const x of pendientes) {
    const prev = porProveedor.get(x.o.proveedorId) ?? { nombre: x.o.proveedor.nombre, saldo: 0 };
    prev.saldo += x.saldo;
    porProveedor.set(x.o.proveedorId, prev);
  }
  const proveedoresConDeuda = [...porProveedor.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.saldo - a.saldo);

  return (
    <>
      <PageHeader title="Pagos" description="Órdenes de compra recibidas pendientes y registro de pagos" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1"><CardDescription>Total por pagar</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold tracking-tight">{formatGs(totalPorPagar)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Órdenes pendientes</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold tracking-tight">{pendientes.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Proveedores con deuda</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold tracking-tight">{proveedoresConDeuda.length}</div></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Órdenes pendientes */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead><TableHead>Proveedor</TableHead><TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientes.length === 0 && <EmptyRow cols={5}>No hay órdenes recibidas pendientes de pago.</EmptyRow>}
              {pendientes.map(({ o, total, saldo }) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/compras/ordenes/${o.id}`} className="font-medium text-primary hover:underline">OC #{o.id}</Link>
                  </TableCell>
                  <TableCell className="font-medium">{o.proveedor.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{formatFecha(o.fecha)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatGs(total)}</TableCell>
                  <TableCell className="text-right font-medium">{formatGs(saldo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Registrar pago + últimos pagos */}
        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader><CardTitle>Registrar pago</CardTitle></CardHeader>
            <CardContent>
              {cuentas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Primero creá una cuenta en{" "}
                  <Link href="/finanzas/caja" className="text-primary hover:underline">Caja y bancos</Link>.
                </p>
              ) : proveedoresConDeuda.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay proveedores con deuda pendiente.</p>
              ) : (
                <ActionForm action={registrarPago} className="grid gap-3">
                  <Field label="Proveedor">
                    <NativeSelect name="proveedorId" defaultValue="" required>
                      <option value="" disabled>Elegí…</option>
                      {proveedoresConDeuda.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre} — debés {formatGs(c.saldo)}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Monto"><Input name="monto" type="number" min={0} step="1" required /></Field>
                    <Field label="Medio">
                      <NativeSelect name="medio" defaultValue="Efectivo">
                        {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </NativeSelect>
                    </Field>
                  </div>
                  <Field label="Sale de">
                    <NativeSelect name="cuentaId" defaultValue={cuentas[0]?.id} required>
                      {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Nota"><Input name="nota" /></Field>
                  <div className="flex gap-2">
                    <SubmitButton>Registrar pago</SubmitButton>
                    <Button type="reset" variant="ghost">Cancelar</Button>
                  </div>
                </ActionForm>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Últimos pagos</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {pagos.length === 0 && <p className="text-muted-foreground">Todavía no hay pagos.</p>}
              {pagos.map((pg) => (
                <div key={pg.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{pg.proveedor.nombre}</div>
                    <div className="text-xs text-muted-foreground">{formatFecha(pg.fecha)} · {pg.medio ?? "—"} · {pg.cuenta.nombre}</div>
                  </div>
                  <span className="shrink-0 font-medium text-destructive">{formatGs(pg.monto)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
