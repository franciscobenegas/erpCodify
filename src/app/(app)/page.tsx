import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getTenant } from "@/lib/auth";
import { APP_TZ, formatFecha, formatGs, formatQty, hoyISO, toNum } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Tablero" };

const dia = new Intl.DateTimeFormat("es-PY", { weekday: "short", day: "2-digit", timeZone: APP_TZ });
const claveDia = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }); // "2026-10-27"
// Paraguay usa UTC-3 todo el año desde 2024
const inicioDia = (iso: string) => new Date(`${iso}T00:00:00-03:00`);

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ sinPermiso?: string }> }) {
  const [{ s, db }, { sinPermiso }] = await Promise.all([getTenant(), searchParams]);
  const hoy = hoyISO();
  const inicioMes = inicioDia(hoy.slice(0, 8) + "01");
  const hace14 = new Date(inicioDia(hoy).getTime() - 13 * 86_400_000);

  const [ventasMes, comprasPend, productos, ultimas, ventas14] = await Promise.all([
    db.factura.aggregate({ where: { estado: "EMITIDA", fecha: { gte: inicioMes } }, _sum: { total: true }, _count: true }),
    db.ordenCompra.aggregate({ where: { estado: "CONFIRMADA" }, _sum: { total: true }, _count: true }),
    db.producto.findMany({ where: { activo: true }, include: { stocks: true } }),
    db.factura.findMany({ where: { estado: { not: "BORRADOR" } }, include: { cliente: true }, orderBy: { fecha: "desc" }, take: 6 }),
    db.factura.findMany({ where: { estado: "EMITIDA", fecha: { gte: hace14 } }, select: { fecha: true, total: true } }),
  ]);

  const conStock = productos.map((p) => ({ p, total: p.stocks.reduce((a, x) => a + toNum(x.cantidad), 0) }));
  const valorInventario = conStock.reduce((a, x) => a + x.total * toNum(x.p.costo), 0);
  const bajoMinimo = conStock.filter((x) => x.total <= toNum(x.p.stockMinimo)).sort((a, b) => a.total - b.total);

  // Ventas de los últimos 14 días
  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hace14.getTime() + i * 86_400_000);
    return { d, key: claveDia.format(d), total: 0 };
  });
  for (const v of ventas14) {
    const x = dias.find((d) => d.key === claveDia.format(v.fecha));
    if (x) x.total += toNum(v.total);
  }
  const max = Math.max(1, ...dias.map((d) => d.total));

  const kpis = [
    { label: "Ventas del mes", valor: formatGs(ventasMes._sum.total), sub: `${ventasMes._count} factura(s) emitida(s)` },
    { label: "Valor del inventario", valor: formatGs(valorInventario), sub: `${productos.length} producto(s) activos` },
    { label: "Compras por recibir", valor: formatGs(comprasPend._sum.total), sub: `${comprasPend._count} orden(es) confirmada(s)` },
    { label: "Bajo stock mínimo", valor: String(bajoMinimo.length), sub: "productos a reponer" },
  ];

  return (
    <>
      <PageHeader title={`Hola, ${s.nombre.split(" ")[0]}`} description="Resumen de la operación" />
      {sinPermiso && (
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          Tu rol no tiene acceso a esa sección.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-1"><CardDescription>{k.label}</CardDescription></CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{k.valor}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Ventas últimos 14 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-1.5">
              {dias.map((d) => (
                <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    className="rounded-t-[3px] bg-primary/80 transition-colors group-hover:bg-primary"
                    style={{ height: `${Math.max(d.total ? 3 : 0, (d.total / max) * 100)}%` }}
                  />
                  <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-0.5 text-xs text-background group-hover:block">
                    {formatGs(d.total)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 text-[10px] text-muted-foreground">
              {dias.map((d, i) => (
                <div key={d.key} className="flex-1 text-center">{i % 2 === 0 ? dia.format(d.d) : ""}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-warning" /> Reponer stock</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {bajoMinimo.length === 0 && <p className="text-muted-foreground">Todo en orden.</p>}
            {bajoMinimo.slice(0, 8).map(({ p, total }) => (
              <div key={p.id} className="flex justify-between gap-3">
                <Link href={`/inventario/productos/${p.id}`} className="truncate hover:underline">{p.nombre}</Link>
                <span className="shrink-0 text-muted-foreground">{formatQty(total)} / mín {formatQty(p.stockMinimo)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Últimas facturas</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {ultimas.length === 0 && <p className="text-muted-foreground">Todavía no se emitieron facturas.</p>}
          {ultimas.map((f) => (
            <Link key={f.id} href={`/ventas/facturas/${f.id}`} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
              <span className="w-32 font-mono text-xs">{f.numero}</span>
              <span className="flex-1 truncate">{f.cliente.nombre}</span>
              <span className="hidden text-muted-foreground sm:inline">{formatFecha(f.fecha)}</span>
              <EstadoBadge estado={f.estado} />
              <span className="w-32 text-right font-medium">{formatGs(f.total)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
