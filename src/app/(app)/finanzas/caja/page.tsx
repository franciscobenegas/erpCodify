import { getTenant } from "@/lib/auth";
import { formatGs, toNum } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearCuenta, registrarMovimiento, transferir } from "./actions";

export const metadata = { title: "Caja y bancos" };

const fechaHora = new Intl.DateTimeFormat("es-PY", { dateStyle: "short", timeStyle: "short" });
const ORIGEN: Record<string, string> = {
  COBRO: "Cobro", PAGO: "Pago", GASTO: "Gasto", INGRESO: "Ingreso", TRANSFERENCIA: "Transferencia", AJUSTE: "Ajuste",
};

export default async function CajaPage() {
  const { db } = await getTenant("finanzas");
  const [cuentas, movimientos] = await Promise.all([
    db.cuentaFinanciera.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
    db.movimientoCaja.findMany({ include: { cuenta: true, usuario: true }, orderBy: { fecha: "desc" }, take: 150 }),
  ]);
  const saldoTotal = cuentas.reduce((a, c) => a + toNum(c.saldo), 0);

  const selCuenta = (name: string, label = "Cuenta") => (
    <Field label={label}>
      <NativeSelect name={name} defaultValue="" required>
        <option value="" disabled>Elegí…</option>
        {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </NativeSelect>
    </Field>
  );

  return (
    <>
      <PageHeader title="Caja y bancos" description="Cuentas, saldos y movimientos de dinero" />

      {/* Saldos */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cuentas.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                {c.nombre}
                <Badge variant="secondary">{c.tipo === "BANCO" ? "Banco" : "Caja"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold tracking-tight ${toNum(c.saldo) < 0 ? "text-destructive" : ""}`}>{formatGs(c.saldo)}</div>
            </CardContent>
          </Card>
        ))}
        <Card className="bg-muted/30">
          <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold tracking-tight">{formatGs(saldoTotal)}</div></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Movimientos */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead><TableHead>Cuenta</TableHead><TableHead>Concepto</TableHead>
                <TableHead>Origen</TableHead><TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 && <EmptyRow cols={5}>Todavía no hay movimientos.</EmptyRow>}
              {movimientos.map((m) => {
                const ingreso = m.tipo === "INGRESO";
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{fechaHora.format(m.fecha)}</TableCell>
                    <TableCell>{m.cuenta.nombre}</TableCell>
                    <TableCell>
                      <div>{m.concepto}</div>
                      {m.referencia && <div className="text-xs text-muted-foreground">{m.referencia}</div>}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{ORIGEN[m.origen] ?? m.origen}</Badge></TableCell>
                    <TableCell className={`text-right font-medium ${ingreso ? "text-success" : "text-destructive"}`}>
                      {ingreso ? "+" : "−"}{formatGs(m.monto)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Formularios */}
        <div className="grid h-fit gap-6">
          {cuentas.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Registrar movimiento</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={registrarMovimiento} className="grid gap-3">
                  {selCuenta("cuentaId")}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo">
                      <NativeSelect name="tipo" defaultValue="INGRESO">
                        <option value="INGRESO">Ingreso</option>
                        <option value="EGRESO">Egreso</option>
                      </NativeSelect>
                    </Field>
                    <Field label="Monto"><Input name="monto" type="number" min={0} step="1" required /></Field>
                  </div>
                  <Field label="Concepto"><Input name="concepto" placeholder="Pago de alquiler, aporte de socio…" required /></Field>
                  <div className="flex gap-2">
                    <SubmitButton>Registrar</SubmitButton>
                    <Button type="reset" variant="ghost">Cancelar</Button>
                  </div>
                </ActionForm>
              </CardContent>
            </Card>
          )}

          {cuentas.length > 1 && (
            <Card>
              <CardHeader><CardTitle>Transferencia</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={transferir} className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    {selCuenta("origenId", "Desde")}
                    {selCuenta("destinoId", "Hacia")}
                  </div>
                  <Field label="Monto"><Input name="monto" type="number" min={0} step="1" required /></Field>
                  <Field label="Nota"><Input name="nota" /></Field>
                  <div className="flex gap-2">
                    <SubmitButton>Transferir</SubmitButton>
                    <Button type="reset" variant="ghost">Cancelar</Button>
                  </div>
                </ActionForm>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Nueva cuenta</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={crearCuenta} className="grid gap-3">
                <Field label="Nombre"><Input name="nombre" placeholder="Caja principal, Banco Itaú…" required /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo">
                    <NativeSelect name="tipo" defaultValue="CAJA">
                      <option value="CAJA">Caja</option>
                      <option value="BANCO">Banco</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Saldo inicial"><Input name="saldoInicial" type="number" min={0} step="1" defaultValue={0} /></Field>
                </div>
                <div><SubmitButton>Crear cuenta</SubmitButton></div>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
