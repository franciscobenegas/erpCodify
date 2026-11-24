import { getTenant } from "@/lib/auth";
import { formatQty, toNum } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ajustarStock, transferirStock } from "../actions";

export const metadata = { title: "Movimientos" };

const ORIGEN: Record<string, string> = {
  COMPRA: "Compra", VENTA: "Venta", ANULACION_VENTA: "Anulación", AJUSTE: "Ajuste", TRANSFERENCIA: "Transferencia",
};

const fechaHora = new Intl.DateTimeFormat("es-PY", { dateStyle: "short", timeStyle: "short" });

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { producto } = await searchParams;
  const { db } = await getTenant();
  const [movs, productos, depositos] = await Promise.all([
    db.movimientoStock.findMany({
      where: producto ? { productoId: Number(producto) } : undefined,
      include: { producto: true, deposito: true, usuario: true },
      orderBy: { fecha: "desc" },
      take: 200,
    }),
    db.producto.findMany({ where: { activo: true, llevaInventario: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, codigo: true } }),
    db.deposito.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
  ]);

  const selProducto = (
    <NativeSelect name="productoId" defaultValue={producto ?? ""} required>
      <option value="" disabled>Elegí un producto…</option>
      {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
    </NativeSelect>
  );
  const selDeposito = (name: string) => (
    <NativeSelect name={name} defaultValue="" required>
      <option value="" disabled>Elegí…</option>
      {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
    </NativeSelect>
  );

  return (
    <>
      <PageHeader title="Movimientos de stock" description="Historial (últimos 200) y ajustes manuales" />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          <form className="mb-4 flex gap-2">
            <NativeSelect name="producto" defaultValue={producto ?? ""} className="sm:max-w-sm">
              <option value="">Todos los productos</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </NativeSelect>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead><TableHead>Producto</TableHead><TableHead>Depósito</TableHead>
                  <TableHead>Origen</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movs.length === 0 && <EmptyRow cols={6}>Sin movimientos.</EmptyRow>}
                {movs.map((m) => {
                  const c = toNum(m.cantidad);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{fechaHora.format(m.fecha)}</TableCell>
                      <TableCell className="font-medium">{m.producto.nombre}</TableCell>
                      <TableCell>{m.deposito.nombre}</TableCell>
                      <TableCell><Badge variant="secondary">{ORIGEN[m.origen]}</Badge></TableCell>
                      <TableCell className={`text-right font-medium ${c < 0 ? "text-destructive" : "text-success"}`}>
                        {c > 0 ? "+" : ""}{formatQty(c)}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground" title={m.nota ?? undefined}>
                        {m.referencia ?? m.nota ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader><CardTitle>Ajuste de inventario</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={ajustarStock} className="grid gap-3">
                <Field label="Producto">{selProducto}</Field>
                <Field label="Depósito">{selDeposito("depositoId")}</Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Operación">
                    <NativeSelect name="modo" defaultValue="fijar">
                      <option value="fijar">Fijar en</option>
                      <option value="sumar">Sumar</option>
                      <option value="restar">Restar</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Cantidad"><Input name="cantidad" type="number" min={0} step="any" required /></Field>
                </div>
                <Field label="Motivo"><Input name="nota" placeholder="Conteo físico, rotura, vencimiento…" /></Field>
                <div className="flex gap-2">
                  <SubmitButton>Registrar ajuste</SubmitButton>
                  <Button type="reset" variant="ghost">Cancelar</Button>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Transferencia entre depósitos</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={transferirStock} className="grid gap-3">
                <Field label="Producto">{selProducto}</Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desde">{selDeposito("origenId")}</Field>
                  <Field label="Hacia">{selDeposito("destinoId")}</Field>
                </div>
                <Field label="Cantidad"><Input name="cantidad" type="number" min={0} step="any" required /></Field>
                <Field label="Nota"><Input name="nota" /></Field>
                <div className="flex gap-2">
                  <SubmitButton>Transferir</SubmitButton>
                  <Button type="reset" variant="ghost">Cancelar</Button>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
