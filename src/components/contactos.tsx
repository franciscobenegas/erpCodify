import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { SearchBar } from "@/components/search-bar";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { guardarContacto } from "@/app/(app)/contactos-actions";

type Tipo = "cliente" | "proveedor";
const cfg = {
  cliente: { titulo: "Clientes", singular: "cliente", base: "/ventas/clientes" },
  proveedor: { titulo: "Proveedores", singular: "proveedor", base: "/compras/proveedores" },
};

export async function ContactosList({ tipo, q }: { tipo: Tipo; q?: string }) {
  const c = cfg[tipo];
  const contactos = await prisma.contacto.findMany({
    where: {
      ...(tipo === "cliente" ? { esCliente: true } : { esProveedor: true }),
      ...(q && { OR: [{ nombre: { contains: q, mode: "insensitive" } }, { ruc: { contains: q } }] }),
    },
    orderBy: { nombre: "asc" },
    take: 200,
  });
  return (
    <>
      <PageHeader
        title={c.titulo}
        actions={<Button asChild><Link href={`${c.base}/nuevo`}><Plus /> Nuevo {c.singular}</Link></Button>}
      />
      <SearchBar q={q} placeholder="Nombre o RUC" />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nombre</TableHead><TableHead>RUC</TableHead><TableHead>Teléfono</TableHead><TableHead>Email</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {contactos.length === 0 && <EmptyRow cols={5}>No hay {c.titulo.toLowerCase()} que coincidan.</EmptyRow>}
            {contactos.map((x) => (
              <TableRow key={x.id} className={!x.activo ? "opacity-50" : undefined}>
                <TableCell><Link href={`${c.base}/${x.id}`} className="font-medium text-primary hover:underline">{x.nombre}</Link></TableCell>
                <TableCell className="font-mono text-xs">{x.ruc ?? "—"}</TableCell>
                <TableCell>{x.telefono ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{x.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {x.esCliente && x.esProveedor && <Badge variant="secondary">Cliente y proveedor</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

export async function ContactoEdit({ tipo, id }: { tipo: Tipo; id: string }) {
  const c = cfg[tipo];
  const nuevo = id === "nuevo";
  const x = nuevo ? null : await prisma.contacto.findUnique({ where: { id: Number(id) } });
  if (!nuevo && !x) notFound();

  return (
    <>
      <PageHeader title={nuevo ? `Nuevo ${c.singular}` : x!.nombre} />
      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <ActionForm action={guardarContacto} className="grid gap-4">
            <input type="hidden" name="id" value={x?.id ?? ""} />
            <input type="hidden" name="tipo" value={tipo} />
            <Field label="Nombre o razón social"><Input name="nombre" defaultValue={x?.nombre} required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="RUC / CI" hint="Ej. 80012345-6"><Input name="ruc" defaultValue={x?.ruc ?? ""} /></Field>
              <Field label="Teléfono"><Input name="telefono" defaultValue={x?.telefono ?? ""} /></Field>
            </div>
            <Field label="Email"><Input name="email" type="email" defaultValue={x?.email ?? ""} /></Field>
            <Field label="Dirección"><Textarea name="direccion" defaultValue={x?.direccion ?? ""} /></Field>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {tipo === "cliente" ? (
                <label className="flex items-center gap-2"><input type="checkbox" name="esProveedor" defaultChecked={x?.esProveedor} className="size-4" /> También es proveedor</label>
              ) : (
                <label className="flex items-center gap-2"><input type="checkbox" name="esCliente" defaultChecked={x?.esCliente} className="size-4" /> También es cliente</label>
              )}
              <label className="flex items-center gap-2"><input type="checkbox" name="activo" defaultChecked={x?.activo ?? true} className="size-4" /> Activo</label>
            </div>
            <div className="flex gap-2">
              <SubmitButton>Guardar</SubmitButton>
              <Button variant="ghost" asChild><Link href={c.base}>Cancelar</Link></Button>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
