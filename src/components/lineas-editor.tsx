"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input, NativeSelect } from "@/components/ui/input";
import { calcularTotales } from "@/lib/iva";
import { formatGs, formatQty } from "@/lib/utils";

export type ProductoOpcion = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  precioVenta: number;
  costo: number;
  tasaIva: number;
  codigoBarras: string | null;
  codigosAlt: string[];
  unidadesAlt: { nombre: string; factor: number }[];
  preciosCantidad: { cantidadMin: number; precio: number }[];
};

export type LineaInicial = { productoId: number; cantidad: number; precio: number };

// `cantidad` está en la unidad elegida; `factor` la convierte a la unidad base.
type Linea = { key: number; productoId: number | ""; cantidad: number; factor: number; precio: number };

let seq = 0;

/** Precio sugerido para una cantidad base: en compra usa el costo; en venta aplica
 *  la escala mayorista más alta que no supere la cantidad, o el precio de lista. */
function precioSugerido(p: ProductoOpcion, cantidadBase: number, modo: "venta" | "compra") {
  if (modo === "compra") return p.costo;
  const escala = [...p.preciosCantidad].sort((a, b) => b.cantidadMin - a.cantidadMin).find((e) => cantidadBase >= e.cantidadMin);
  return escala?.precio ?? p.precioVenta;
}

/**
 * Editor de líneas para facturas (modo "venta", precio = precio de venta)
 * y órdenes de compra (modo "compra", precio = costo).
 * Envía las líneas al server action en un input oculto "lineas" (JSON) ya
 * convertidas a la unidad base (cantidad = cantidad ingresada × factor).
 */
export function LineasEditor({
  productos,
  modo,
  iniciales = [],
}: {
  productos: ProductoOpcion[];
  modo: "venta" | "compra";
  iniciales?: LineaInicial[];
}) {
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const opciones = useMemo(
    () =>
      productos.map((p) => ({
        value: String(p.id),
        label: `${p.codigo} · ${p.nombre}${modo === "venta" ? ` (IVA ${p.tasaIva === 0 ? "exenta" : p.tasaIva + "%"})` : ""}`,
        // Incluye código de barras y alternativos para escanear/buscar.
        keywords: `${p.codigo} ${p.nombre} ${p.codigoBarras ?? ""} ${p.codigosAlt.join(" ")}`,
      })),
    [productos, modo],
  );
  const [lineas, setLineas] = useState<Linea[]>(() =>
    iniciales.length
      ? iniciales.map((l) => ({ key: ++seq, factor: 1, ...l }))
      : [{ key: ++seq, productoId: "", cantidad: 1, factor: 1, precio: 0 }],
  );

  const set = (key: number, patch: Partial<Linea>) =>
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const elegirProducto = (key: number, id: string) => {
    const p = porId.get(Number(id));
    if (!p) return set(key, { productoId: "", factor: 1, precio: 0 });
    setLineas((ls) =>
      ls.map((l) => (l.key === key ? { ...l, productoId: p.id, factor: 1, precio: precioSugerido(p, l.cantidad, modo) } : l)),
    );
  };

  // Recalcula el precio sugerido al cambiar cantidad o unidad (mantiene el override manual del precio).
  const recalcular = (l: Linea, patch: Partial<Linea>): Linea => {
    const next = { ...l, ...patch };
    const p = next.productoId === "" ? undefined : porId.get(next.productoId);
    if (p) next.precio = precioSugerido(p, next.cantidad * next.factor, modo);
    return next;
  };

  const validas = lineas.filter((l) => l.productoId !== "" && l.cantidad > 0);
  const conSubtotal = validas.map((l) => ({
    cantidad: l.cantidad * l.factor,
    precio: l.precio,
    subtotal: Math.round(l.cantidad * l.factor * l.precio),
    tasaIva: porId.get(l.productoId as number)?.tasaIva ?? 10,
  }));
  const tot = calcularTotales(conSubtotal);

  return (
    <div className="grid gap-3">
      <input
        type="hidden"
        name="lineas"
        value={JSON.stringify(validas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad * l.factor, precio: l.precio })))}
      />

      <div className="hidden grid-cols-[1fr_90px_120px_140px_140px_40px] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span>Producto</span>
        <span className="text-right">Cantidad</span>
        <span>Unidad</span>
        <span className="text-right">{modo === "venta" ? "Precio (IVA incl.)" : "Costo unitario"}</span>
        <span className="text-right">Subtotal</span>
        <span />
      </div>

      {lineas.map((l) => {
        const p = l.productoId !== "" ? porId.get(l.productoId) : undefined;
        const cantidadBase = l.cantidad * l.factor;
        const mayorista = modo === "venta" && p && l.precio !== p.precioVenta && p.preciosCantidad.length > 0;
        return (
          <div key={l.key} className="grid grid-cols-2 gap-2 rounded-lg border p-2 md:grid-cols-[1fr_90px_120px_140px_140px_40px] md:rounded-none md:border-0 md:p-0">
            <Combobox
              className="col-span-2 md:col-span-1"
              value={l.productoId === "" ? "" : String(l.productoId)}
              onChange={(v) => elegirProducto(l.key, v)}
              options={opciones}
              placeholder="Elegí un producto…"
              searchPlaceholder="Código, nombre o código de barras…"
              aria-label="Producto"
            />
            <Input
              type="number" min={0} step="any" className="text-right" aria-label="Cantidad"
              value={l.cantidad}
              onChange={(e) => set(l.key, { cantidad: Number(e.target.value) })}
              onBlur={() => setLineas((ls) => ls.map((x) => (x.key === l.key ? recalcular(x, {}) : x)))}
            />
            {p && p.unidadesAlt.length > 0 ? (
              <NativeSelect
                aria-label="Unidad"
                value={l.factor}
                onChange={(e) => setLineas((ls) => ls.map((x) => (x.key === l.key ? recalcular(x, { factor: Number(e.target.value) }) : x)))}
              >
                <option value={1}>{p.unidad || "UN"}</option>
                {p.unidadesAlt.map((u) => <option key={u.nombre} value={u.factor}>{u.nombre}</option>)}
              </NativeSelect>
            ) : (
              <div className="flex h-9 items-center text-sm text-muted-foreground">{p?.unidad ?? "—"}</div>
            )}
            <div>
              <Input
                type="number" min={0} step="1" className="text-right" aria-label="Precio"
                value={l.precio}
                onChange={(e) => set(l.key, { precio: Number(e.target.value) })}
              />
              {mayorista && <div className="mt-0.5 text-right text-xs text-success">precio mayorista</div>}
            </div>
            <div className="flex flex-col items-end justify-center text-sm font-medium">
              {p ? formatGs(Math.round(cantidadBase * l.precio)) : "—"}
              {p && l.factor !== 1 && <span className="text-xs font-normal text-muted-foreground">= {formatQty(cantidadBase)} {p.unidad}</span>}
            </div>
            <Button
              type="button" variant="ghost" size="icon" aria-label="Quitar línea"
              onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
            >
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        );
      })}

      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, { key: ++seq, productoId: "", cantidad: 1, factor: 1, precio: 0 }])}>
          <Plus /> Agregar línea
        </Button>
      </div>

      <div className="ml-auto grid w-full max-w-xs gap-1 rounded-lg bg-muted/60 p-4 text-sm">
        {modo === "venta" && (
          <>
            <Fila label="Exentas" v={tot.exenta} />
            <Fila label="Gravadas 5%" v={tot.gravada5} />
            <Fila label="Gravadas 10%" v={tot.gravada10} />
            <Fila label="IVA 5%" v={tot.iva5} muted />
            <Fila label="IVA 10%" v={tot.iva10} muted />
          </>
        )}
        <div className="mt-1 flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatGs(tot.total)}</span>
        </div>
      </div>
    </div>
  );
}

function Fila({ label, v, muted }: { label: string; v: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span>{formatGs(v)}</span>
    </div>
  );
}
