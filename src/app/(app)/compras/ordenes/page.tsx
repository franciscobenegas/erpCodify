import Link from "next/link";
import { Plus } from "lucide-react";
import type { EstadoOrdenCompra } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatFecha, formatGs } from "@/lib/utils";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { EstadoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Órdenes de compra" };

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const ordenes = await prisma.ordenCompra.findMany({
    where: estado ? { estado: estado as EstadoOrdenCompra } : undefined,
    include: { proveedor: true, deposito: true },
    orderBy: { id: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Órdenes de compra"
        description="Borrador → Confirmada → Recibida (ingresa stock)"
        actions={<Button asChild><Link href="/compras/ordenes/nueva"><Plus /> Nueva orden</Link></Button>}
      />
      <form className="mb-4 flex gap-2">
        <NativeSelect name="estado" defaultValue={estado ?? ""} className="w-48">
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="CONFIRMADA">Confirmada</option>
          <option value="RECIBIDA">Recibida</option>
          <option value="CANCELADA">Cancelada</option>
        </NativeSelect>
        <Button type="submit" variant="outline">Filtrar</Button>
      </form>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead><TableHead>Fecha</TableHead><TableHead>Proveedor</TableHead>
              <TableHead>Depósito</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.length === 0 && <EmptyRow cols={6}>No hay órdenes.</EmptyRow>}
            {ordenes.map((o) => (
              <TableRow key={o.id}>
                <TableCell><Link href={`/compras/ordenes/${o.id}`} className="font-medium text-primary hover:underline">OC #{o.id}</Link></TableCell>
                <TableCell>{formatFecha(o.fecha)}</TableCell>
                <TableCell className="font-medium">{o.proveedor.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{o.deposito.nombre}</TableCell>
                <TableCell><EstadoBadge estado={o.estado} /></TableCell>
                <TableCell className="text-right font-medium">{formatGs(o.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
