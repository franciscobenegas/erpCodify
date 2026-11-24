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
import { UnidadesAltEditor, PreciosCantidadEditor } from "./producto-tablas";
import { guardarProducto } from "../../actions";

/** Encabezado de sección dentro del formulario. */
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{titulo}</h3>
      {children}
    </div>
  );
}

function Check({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4" />
      <span>
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nuevo = id === "nuevo";
  const { db } = await getTenant();
  const [p, categorias, marcas, modelos, unidades] = await Promise.all([
    nuevo
      ? null
      : db.producto.findUnique({
          where: { id: Number(id) },
          include: { stocks: { include: { deposito: true } }, unidadesAlt: true, preciosCantidad: { orderBy: { cantidadMin: "asc" } } },
        }),
    db.categoria.findMany({ orderBy: { nombre: "asc" } }),
    db.marca.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    db.modeloProducto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    db.unidadMedida.findMany({ where: { activo: true }, orderBy: { codigo: "asc" } }),
  ]);
  if (!nuevo && !p) notFound();

  const unidadesIni = (p?.unidadesAlt ?? []).map((u) => ({ nombre: u.nombre, factor: toNum(u.factor) }));
  const preciosIni = (p?.preciosCantidad ?? []).map((x) => ({ cantidadMin: toNum(x.cantidadMin), precio: toNum(x.precio) }));

  return (
    <>
      <PageHeader title={nuevo ? "Nuevo producto" : p!.nombre} description={p?.codigo} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="pt-5">
            <ActionForm action={guardarProducto} className="grid gap-6">
              <input type="hidden" name="id" value={p?.id ?? ""} />

              <Seccion titulo="Información principal">
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                    <Field label="Código"><Input name="codigo" defaultValue={p?.codigo} required /></Field>
                    <Field label="Nombre"><Input name="nombre" defaultValue={p?.nombre} required /></Field>
                  </div>
                  <Field label="Descripción"><Textarea name="descripcion" defaultValue={p?.descripcion ?? ""} /></Field>
                  <Field label="Imagen del producto" hint="JPG, PNG o WebP · máximo 5 MB">
                    <ProductoImagen actual={p?.imagenUrl} nombre={p?.nombre} />
                  </Field>
                </div>
              </Seccion>

              <Seccion titulo="Códigos y categorización">
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Código de barras" hint="EAN/UPC para cobrar en caja con lector">
                      <Input name="codigoBarras" defaultValue={p?.codigoBarras ?? ""} />
                    </Field>
                    <Field label="Códigos alternativos" hint="Separados por coma">
                      <Input name="codigosAlt" defaultValue={(p?.codigosAlt ?? []).join(", ")} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Categoría">
                      <NativeSelect name="categoriaId" defaultValue={p?.categoriaId ?? ""}>
                        <option value="">Sin categoría</option>
                        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </NativeSelect>
                    </Field>
                    <Field label="Marca">
                      <NativeSelect name="marcaId" defaultValue={p?.marcaId ?? ""}>
                        <option value="">Sin marca</option>
                        {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </NativeSelect>
                    </Field>
                    <Field label="Modelo">
                      <NativeSelect name="modeloId" defaultValue={p?.modeloId ?? ""}>
                        <option value="">Sin modelo</option>
                        {modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </NativeSelect>
                    </Field>
                  </div>
                </div>
              </Seccion>

              <Seccion titulo="Precios e impuesto">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Precio de venta (IVA incl.)"><Input name="precioVenta" type="number" min={0} step="1" defaultValue={toNum(p?.precioVenta)} required /></Field>
                  <Field label="Costo" hint="Se actualiza al recibir compras"><Input name="costo" type="number" min={0} step="1" defaultValue={toNum(p?.costo)} /></Field>
                  <Field label="IVA">
                    <NativeSelect name="tasaIva" defaultValue={p?.tasaIva ?? 10}>
                      <option value={10}>10%</option>
                      <option value={5}>5%</option>
                      <option value={0}>Exenta</option>
                    </NativeSelect>
                  </Field>
                </div>
              </Seccion>

              <Seccion titulo="Inventario">
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Check name="esServicio" label="Es un servicio" hint="Intangible: no mueve stock" defaultChecked={p?.esServicio ?? false} />
                    <Check name="llevaInventario" label="Llevar inventario" hint="Controlar stock de este producto" defaultChecked={p?.llevaInventario ?? true} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Unidad" hint={unidades.length ? "Elegí del catálogo o escribí" : undefined}>
                      <Input name="unidad" list="unidades" defaultValue={p?.unidad ?? "UN"} required />
                      {unidades.length > 0 && (
                        <datalist id="unidades">
                          {unidades.map((u) => <option key={u.id} value={u.codigo}>{u.nombre}</option>)}
                        </datalist>
                      )}
                    </Field>
                    <Field label="Stock mínimo"><Input name="stockMinimo" type="number" min={0} step="any" defaultValue={toNum(p?.stockMinimo)} /></Field>
                    <Field label="Stock ideal"><Input name="stockIdeal" type="number" min={0} step="any" defaultValue={toNum(p?.stockIdeal)} /></Field>
                  </div>
                </div>
              </Seccion>

              <Seccion titulo="Unidades de medida alternativas">
                <p className="mb-3 text-xs text-muted-foreground">Ej.: Docena = 12 unidades base. Se usarán para comprar o vender en otra unidad.</p>
                <UnidadesAltEditor iniciales={unidadesIni} />
              </Seccion>

              <Seccion titulo="Precios por cantidad (mayorista)">
                <p className="mb-3 text-xs text-muted-foreground">A partir de la cantidad indicada, se aplica el precio de la escala.</p>
                <PreciosCantidadEditor iniciales={preciosIni} />
              </Seccion>

              <Seccion titulo="Disponibilidad">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Check name="habilitadoVenta" label="Habilitado para venta" defaultChecked={p?.habilitadoVenta ?? true} />
                  <Check name="habilitadoCompra" label="Habilitado para compra" defaultChecked={p?.habilitadoCompra ?? true} />
                  <Check name="activo" label="Producto activo" defaultChecked={p?.activo ?? true} />
                </div>
              </Seccion>

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
