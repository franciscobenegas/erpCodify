import { getTenant } from "@/lib/auth";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActionForm, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crearCategoria } from "../actions";

export const metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  const { db } = await getTenant();
  const categorias = await db.categoria.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { productos: true } } } });
  return (
    <>
      <PageHeader title="Categorías" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Productos</TableHead></TableRow></TableHeader>
            <TableBody>
              {categorias.length === 0 && <EmptyRow cols={2}>Todavía no hay categorías.</EmptyRow>}
              {categorias.map((c) => (
                <TableRow key={c.id}><TableCell className="font-medium">{c.nombre}</TableCell><TableCell className="text-right">{c._count.productos}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Nueva categoría</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={crearCategoria} className="flex gap-2">
              <Input name="nombre" placeholder="Nombre" required />
              <SubmitButton>Crear</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
