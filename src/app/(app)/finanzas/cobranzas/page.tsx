import Link from "next/link";
import { getTenant } from "@/lib/auth";
import { formatFecha, formatGs, toNum } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { registrarCobro } from "./actions";

export const metadata = { title: "Cobranzas" };

const MEDIOS = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"];

export default async function CobranzasPage() {
  const { db } = await getTenant("finanzas");
  const [cuentas, facturas, cobros] = await Promise.all([
    db.cuentaFinanciera.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
    db.factura.findMany({
      where: { condicion: "CREDITO", estado: "EMITIDA" },
      include: { cliente: true, cobroAplicaciones: { select: { monto: true } } },
      orderBy: { fecha: "asc" },
    }),
    db.cobro.findMany({ include: { cliente: true, cuenta: true }, orderBy: { fecha: "desc" }, take: 20 }),
  ]);

  // Saldo pendiente por factura
  const pendientes = facturas
    .map((f) => {
      const cobrado = f.cobroAplicaciones.reduce((a, x) => a + toNum(x.monto), 0);
      return { f, total: toNum(f.total), cobrado, saldo: toNum(f.total) - cobrado };
    })
    .filter((x) => x.saldo > 0.5);

  const totalPorCobrar = pendientes.reduce((a, x) => a + x.saldo, 0);

  // Clientes con deuda (para el selector del cobro)
  const porCliente = new Map<number, { nombre: string; saldo: number }>();
  for (const x of pendientes) {
    const prev = porCliente.get(x.f.clienteId) ?? { nombre: x.f.cliente.nombre, saldo: 0 };
    prev.saldo += x.saldo;
    porCliente.set(x.f.clienteId, prev);
  }
  const clientesConDeuda = [...porCliente.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.saldo - a.saldo);

  return (
    <>
      <PageHeader title="Cobranzas" description="Facturas a crédito pendientes y registro de cobros" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1"><CardDescription>Total por cobrar</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold tracking-tight">{formatGs(totalPorCobrar)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Facturas pendientes</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold tracking-tight">{pendientes.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Clientes con deuda</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-semibold tracking-tight">{clientesConDeuda.length}</div></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Facturas pendientes */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factura</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientes.length === 0 && <EmptyRow cols={5}>No hay facturas a crédito pendientes.</EmptyRow>}
              {pendientes.map(({ f, total, saldo }) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Link href={`/ventas/facturas/${f.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                      {f.numero ?? `#${f.id}`}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{f.cliente.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{formatFecha(f.fecha)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatGs(total)}</TableCell>
                  <TableCell className="text-right font-medium">{formatGs(saldo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Registrar cobro + últimos cobros */}
        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader><CardTitle>Registrar cobro</CardTitle></CardHeader>
            <CardContent>
              {cuentas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Primero creá una cuenta en{" "}
                  <Link href="/finanzas/caja" className="text-primary hover:underline">Caja y bancos</Link>.
                </p>
              ) : clientesConDeuda.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay clientes con deuda pendiente.</p>
              ) : (
                <ActionForm action={registrarCobro} className="grid gap-3">
                  <Field label="Cliente">
                    <NativeSelect name="clienteId" defaultValue="" required>
                      <option value="" disabled>Elegí…</option>
                      {clientesConDeuda.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre} — debe {formatGs(c.saldo)}</option>
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
                  <Field label="Ingresa a">
                    <NativeSelect name="cuentaId" defaultValue={cuentas[0]?.id} required>
                      {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Nota"><Input name="nota" /></Field>
                  <div className="flex gap-2">
                    <SubmitButton>Registrar cobro</SubmitButton>
                    <Button type="reset" variant="ghost">Cancelar</Button>
                  </div>
                </ActionForm>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Últimos cobros</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {cobros.length === 0 && <p className="text-muted-foreground">Todavía no hay cobros.</p>}
              {cobros.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.cliente.nombre}</div>
                    <div className="text-xs text-muted-foreground">{formatFecha(c.fecha)} · {c.medio ?? "—"} · {c.cuenta.nombre}</div>
                  </div>
                  <span className="shrink-0 font-medium text-success">{formatGs(c.monto)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
