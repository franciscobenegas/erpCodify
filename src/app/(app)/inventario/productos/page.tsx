import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { getTenant } from "@/lib/auth";
import { formatGs, formatQty, toNum } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Productos" };

export default async function ProductosPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const { q, cat } = await searchParams;
  const where: Prisma.ProductoWhereInput = {
    ...(q && { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { codigo: { contains: q, mode: "insensitive" } }, { codigoBarras: q }] }),
    ...(cat && { categoriaId: Number(cat) }),
  };
  const { db } = await getTenant();
  const [productos, categorias] = await Promise.all([
    db.producto.findMany({ where, include: { categoria: true, stocks: true }, orderBy: { nombre: "asc" }, take: 200 }),
    db.categoria.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Productos"
        description={`${productos.length} producto(s)`}
        actions={<Button asChild><Link href="/inventario/productos/nuevo"><Plus /> Nuevo producto</Link></Button>}
      />
      <SearchBar q={q} placeholder="Código o nombre">
        <NativeSelect name="cat" defaultValue={cat ?? ""} className="w-48">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </NativeSelect>
        <Button type="submit" variant="outline">Filtrar</Button>
      </SearchBar>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Stock total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 && <EmptyRow cols={7}>No hay productos que coincidan.</EmptyRow>}
            {productos.map((p) => {
              const total = p.stocks.reduce((a, s) => a + toNum(s.cantidad), 0);
              const bajo = total <= toNum(p.stockMinimo);
              return (
                <TableRow key={p.id} className={!p.activo ? "opacity-50" : undefined}>
                  <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {p.imagenUrl ? (
                        <Image src={p.imagenUrl} alt="" width={32} height={32} className="size-8 shrink-0 rounded border object-cover" />
                      ) : (
                        <div className="size-8 shrink-0 rounded border bg-muted" aria-hidden />
                      )}
                      <Link href={`/inventario/productos/${p.id}`} className="font-medium text-primary hover:underline">{p.nombre}</Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.categoria?.nombre ?? "—"}</TableCell>
                  <TableCell className="text-right">{p.tasaIva === 0 ? "Exenta" : `${p.tasaIva}%`}</TableCell>
                  <TableCell className="text-right">{formatGs(p.precioVenta)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatGs(p.costo)}</TableCell>
                  <TableCell className="text-right">
                    {bajo ? <Badge variant="warning">{formatQty(total)} {p.unidad}</Badge> : `${formatQty(total)} ${p.unidad}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
