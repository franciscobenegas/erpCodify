"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { calcularTotales } from "@/lib/iva";
import { formatGs } from "@/lib/utils";

export type ProductoOpcion = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  precioVenta: number;
  costo: number;
  tasaIva: number;
};

export type LineaInicial = { productoId: number; cantidad: number; precio: number };

type Linea = { key: number; productoId: number | ""; cantidad: number; precio: number };

let seq = 0;

/**
 * Editor de líneas para facturas (modo "venta", precio = precio de venta)
 * y órdenes de compra (modo "compra", precio = costo).
 * Envía las líneas al server action en un input oculto "lineas" (JSON).
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
  const [lineas, setLineas] = useState<Linea[]>(() =>
    iniciales.length
      ? iniciales.map((l) => ({ key: ++seq, ...l }))
      : [{ key: ++seq, productoId: "", cantidad: 1, precio: 0 }],
  );

  const set = (key: number, patch: Partial<Linea>) =>
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const elegirProducto = (key: number, id: string) => {
    const p = porId.get(Number(id));
    set(key, { productoId: p ? p.id : "", precio: p ? (modo === "venta" ? p.precioVenta : p.costo) : 0 });
  };

  const validas = lineas.filter((l) => l.productoId !== "" && l.cantidad > 0);
  const conSubtotal = validas.map((l) => ({
    ...l,
    subtotal: Math.round(l.cantidad * l.precio),
    tasaIva: porId.get(l.productoId as number)?.tasaIva ?? 10,
  }));
  const tot = calcularTotales(conSubtotal);

  return (
    <div className="grid gap-3">
      <input
        type="hidden"
        name="lineas"
        value={JSON.stringify(validas.map(({ productoId, cantidad, precio }) => ({ productoId, cantidad, precio })))}
      />

      <div className="hidden grid-cols-[1fr_110px_150px_150px_40px] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span>Producto</span>
        <span className="text-right">Cantidad</span>
        <span className="text-right">{modo === "venta" ? "Precio (IVA incl.)" : "Costo unitario"}</span>
        <span className="text-right">Subtotal</span>
        <span />
      </div>

      {lineas.map((l) => {
        const p = l.productoId !== "" ? porId.get(l.productoId) : undefined;
        return (
          <div key={l.key} className="grid grid-cols-2 gap-2 rounded-lg border p-2 md:grid-cols-[1fr_110px_150px_150px_40px] md:rounded-none md:border-0 md:p-0">
            <NativeSelect
              className="col-span-2 md:col-span-1"
              value={l.productoId}
              onChange={(e) => elegirProducto(l.key, e.target.value)}
              aria-label="Producto"
            >
              <option value="">Elegí un producto…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre} {modo === "venta" && `(IVA ${p.tasaIva === 0 ? "exenta" : p.tasaIva + "%"})`}
                </option>
              ))}
            </NativeSelect>
            <Input
              type="number" min={0} step="any" className="text-right" aria-label="Cantidad"
              value={l.cantidad}
              onChange={(e) => set(l.key, { cantidad: Number(e.target.value) })}
            />
            <Input
              type="number" min={0} step="1" className="text-right" aria-label="Precio"
              value={l.precio}
              onChange={(e) => set(l.key, { precio: Number(e.target.value) })}
            />
            <div className="flex h-9 items-center justify-end text-sm font-medium">
              {p ? formatGs(Math.round(l.cantidad * l.precio)) : "—"}
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
        <Button type="button" variant="outline" size="sm" onClick={() => setLineas((ls) => [...ls, { key: ++seq, productoId: "", cantidad: 1, precio: 0 }])}>
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
