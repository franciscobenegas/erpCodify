import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenant } from "@/lib/auth";
import { formatQty, toNum } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductoImagen } from "./producto-imagen";
import { guardarProducto } from "../../actions";

export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nuevo = id === "nuevo";
  const { db } = await getTenant();
  const [p, categorias] = await Promise.all([
    nuevo ? null : db.producto.findUnique({ where: { id: Number(id) }, include: { stocks: { include: { deposito: true } } } }),
    db.categoria.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  if (!nuevo && !p) notFound();

  return (
    <>
      <PageHeader title={nuevo ? "Nuevo producto" : p!.nombre} description={p?.codigo} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="pt-5">
            <ActionForm action={guardarProducto} className="grid gap-4">
              <input type="hidden" name="id" value={p?.id ?? ""} />
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <Field label="Código"><Input name="codigo" defaultValue={p?.codigo} required /></Field>
                <Field label="Nombre"><Input name="nombre" defaultValue={p?.nombre} required /></Field>
              </div>
              <Field label="Descripción"><Textarea name="descripcion" defaultValue={p?.descripcion ?? ""} /></Field>
              <Field label="Imagen del producto" hint="JPG, PNG o WebP · máximo 5 MB">
                <ProductoImagen actual={p?.imagenUrl} nombre={p?.nombre} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Categoría">
                  <NativeSelect name="categoriaId" defaultValue={p?.categoriaId ?? ""}>
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Unidad"><Input name="unidad" defaultValue={p?.unidad ?? "UN"} required /></Field>
                <Field label="IVA">
                  <NativeSelect name="tasaIva" defaultValue={p?.tasaIva ?? 10}>
                    <option value={10}>10%</option>
                    <option value={5}>5%</option>
                    <option value={0}>Exenta</option>
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Precio de venta (IVA incl.)"><Input name="precioVenta" type="number" min={0} step="1" defaultValue={toNum(p?.precioVenta)} required /></Field>
                <Field label="Costo" hint="Se actualiza al recibir compras"><Input name="costo" type="number" min={0} step="1" defaultValue={toNum(p?.costo)} /></Field>
                <Field label="Stock mínimo"><Input name="stockMinimo" type="number" min={0} step="any" defaultValue={toNum(p?.stockMinimo)} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="activo" defaultChecked={p?.activo ?? true} className="size-4" /> Producto activo (disponible para vender y comprar)
              </label>
              <div className="flex gap-2">
                <SubmitButton>Guardar</SubmitButton>
                <Button variant="ghost" asChild><Link href="/inventario/productos">Cancelar</Link></Button>
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        {p && (
          <Card className="h-fit">
            <CardHeader><CardTitle>Stock por depósito</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {p.stocks.length === 0 && <p className="text-muted-foreground">Sin stock registrado.</p>}
              {p.stocks.map((s) => (
                <div key={s.depositoId} className="flex justify-between">
                  <span>{s.deposito.nombre}</span>
                  <span className="font-medium">{formatQty(s.cantidad)} {p.unidad}</span>
                </div>
              ))}
              <Link href={`/inventario/movimientos?producto=${p.id}`} className="mt-2 text-primary hover:underline">Ver movimientos →</Link>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
