import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatGs, formatQty, toNum } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Stock" };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; bajo?: string }> }) {
  const { q, bajo } = await searchParams;
  const [depositos, productos] = await Promise.all([
    prisma.deposito.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
    prisma.producto.findMany({
      where: {
        activo: true,
        ...(q && { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { codigo: { contains: q, mode: "insensitive" } }] }),
      },
      include: { stocks: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  let filas = productos.map((p) => {
    const porDep = new Map(p.stocks.map((s) => [s.depositoId, toNum(s.cantidad)]));
    const total = [...porDep.values()].reduce((a, b) => a + b, 0);
    return { p, porDep, total, valor: total * toNum(p.costo), bajo: total <= toNum(p.stockMinimo) };
  });
  if (bajo) filas = filas.filter((f) => f.bajo);
  const valorTotal = filas.reduce((a, f) => a + f.valor, 0);

  return (
    <>
      <PageHeader title="Stock" description="Existencias por depósito y valorización a costo" />
      <SearchBar q={q} placeholder="Código o nombre">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="bajo" value="1" defaultChecked={!!bajo} className="size-4" /> Solo bajo mínimo
        </label>
        <Button type="submit" variant="outline">Filtrar</Button>
      </SearchBar>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              {depositos.map((d) => <TableHead key={d.id} className="text-right">{d.nombre}</TableHead>)}
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Valorizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 && <EmptyRow cols={depositos.length + 3}>Sin resultados.</EmptyRow>}
            {filas.map(({ p, porDep, total, valor, bajo }) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/inventario/productos/${p.id}`} className="font-medium hover:underline">{p.nombre}</Link>
                  <div className="font-mono text-xs text-muted-foreground">{p.codigo}</div>
                </TableCell>
                {depositos.map((d) => <TableCell key={d.id} className="text-right">{formatQty(porDep.get(d.id) ?? 0)}</TableCell>)}
                <TableCell className="text-right font-medium">
                  {bajo ? <Badge variant="warning">{formatQty(total)}</Badge> : formatQty(total)}
                </TableCell>
                <TableCell className="text-right">{formatGs(valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={depositos.length + 2}>Valor total del inventario</TableCell>
              <TableCell className="text-right">{formatGs(valorTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </>
  );
}
