import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearDeposito } from "../actions";

export const metadata = { title: "Depósitos" };

export default async function DepositosPage() {
  const depositos = await prisma.deposito.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { stocks: { where: { cantidad: { gt: 0 } } } } } },
  });
  return (
    <>
      <PageHeader title="Depósitos" description="Lugares físicos donde se guarda la mercadería" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Dirección</TableHead><TableHead className="text-right">Productos con stock</TableHead></TableRow></TableHeader>
            <TableBody>
              {depositos.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{d.direccion ?? "—"}</TableCell>
                  <TableCell className="text-right">{d._count.stocks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Nuevo depósito</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={crearDeposito} className="grid gap-3">
              <Field label="Nombre"><Input name="nombre" required /></Field>
              <Field label="Dirección"><Input name="direccion" /></Field>
              <div><SubmitButton>Crear</SubmitButton></div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
