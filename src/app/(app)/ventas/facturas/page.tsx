import Link from "next/link";
import { Plus } from "lucide-react";
import type { EstadoFactura, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatFecha, formatGs } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { EstadoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Facturas" };

export default async function FacturasPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { q, estado } = await searchParams;
  const where: Prisma.FacturaWhereInput = {
    ...(estado && { estado: estado as EstadoFactura }),
    ...(q && { OR: [{ numero: { contains: q } }, { cliente: { nombre: { contains: q, mode: "insensitive" } } }] }),
  };
  const facturas = await prisma.factura.findMany({ where, include: { cliente: true }, orderBy: { id: "desc" }, take: 200 });

  return (
    <>
      <PageHeader
        title="Facturas"
        actions={<Button asChild><Link href="/ventas/facturas/nueva"><Plus /> Nueva factura</Link></Button>}
      />
      <SearchBar q={q} placeholder="Número o cliente">
        <NativeSelect name="estado" defaultValue={estado ?? ""} className="w-40">
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="EMITIDA">Emitida</option>
          <option value="ANULADA">Anulada</option>
        </NativeSelect>
        <Button type="submit" variant="outline">Filtrar</Button>
      </SearchBar>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead>
              <TableHead>Condición</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.length === 0 && <EmptyRow cols={6}>No hay facturas.</EmptyRow>}
            {facturas.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Link href={`/ventas/facturas/${f.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                    {f.numero ?? `Borrador #${f.id}`}
                  </Link>
                </TableCell>
                <TableCell>{formatFecha(f.fecha)}</TableCell>
                <TableCell className="font-medium">{f.cliente.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{f.condicion === "CONTADO" ? "Contado" : "Crédito"}</TableCell>
                <TableCell><EstadoBadge estado={f.estado} /></TableCell>
                <TableCell className="text-right font-medium">{formatGs(f.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
