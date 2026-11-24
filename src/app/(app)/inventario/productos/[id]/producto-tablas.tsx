"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

let seq = 0;

type UnidadRow = { key: number; nombre: string; factor: string };
type PrecioRow = { key: number; cantidadMin: string; precio: string };

/** Unidades de medida alternativas por producto (Nombre + factor de conversión a la base). */
export function UnidadesAltEditor({ iniciales = [] }: { iniciales?: { nombre: string; factor: number }[] }) {
  const [rows, setRows] = useState<UnidadRow[]>(() =>
    iniciales.map((u) => ({ key: ++seq, nombre: u.nombre, factor: String(u.factor) })),
  );

  const validas = rows
    .map((r) => ({ nombre: r.nombre.trim(), factor: Number(r.factor) }))
    .filter((r) => r.nombre && r.factor > 0);

  return (
    <div className="grid gap-2">
      <input type="hidden" name="unidadesAlt" value={JSON.stringify(validas)} />
      {rows.length > 0 && (
        <div className="hidden grid-cols-[1fr_140px_40px] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Nombre</span><span className="text-right">Equivale a (base)</span><span />
        </div>
      )}
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[1fr_140px_40px] gap-2">
          <Input placeholder="Ej: Docena" value={r.nombre} aria-label="Nombre"
            onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, nombre: e.target.value } : x)))} />
          <Input type="number" min={0} step="any" className="text-right" placeholder="Ej: 12" value={r.factor} aria-label="Factor"
            onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, factor: e.target.value } : x)))} />
          <Button type="button" variant="ghost" size="icon" aria-label="Quitar"
            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
            <X className="text-muted-foreground" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm"
          onClick={() => setRows((rs) => [...rs, { key: ++seq, nombre: "", factor: "" }])}>
          <Plus /> Agregar unidad
        </Button>
      </div>
    </div>
  );
}

/** Escala de precios por cantidad: a partir de `cantidadMin`, aplica `precio`. */
export function PreciosCantidadEditor({ iniciales = [] }: { iniciales?: { cantidadMin: number; precio: number }[] }) {
  const [rows, setRows] = useState<PrecioRow[]>(() =>
    iniciales.map((p) => ({ key: ++seq, cantidadMin: String(p.cantidadMin), precio: String(p.precio) })),
  );

  const validas = rows
    .map((r) => ({ cantidadMin: Number(r.cantidadMin), precio: Number(r.precio) }))
    .filter((r) => r.cantidadMin > 0 && r.precio >= 0);

  return (
    <div className="grid gap-2">
      <input type="hidden" name="preciosCantidad" value={JSON.stringify(validas)} />
      {rows.length > 0 && (
        <div className="hidden grid-cols-[1fr_160px_40px] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Cantidad mínima</span><span className="text-right">Precio (IVA incl.)</span><span />
        </div>
      )}
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[1fr_160px_40px] gap-2">
          <Input type="number" min={0} step="any" placeholder="Ej: 10" value={r.cantidadMin} aria-label="Cantidad mínima"
            onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, cantidadMin: e.target.value } : x)))} />
          <Input type="number" min={0} step="1" className="text-right" placeholder="Ej: 9000" value={r.precio} aria-label="Precio"
            onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, precio: e.target.value } : x)))} />
          <Button type="button" variant="ghost" size="icon" aria-label="Quitar"
            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
            <X className="text-muted-foreground" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm"
          onClick={() => setRows((rs) => [...rs, { key: ++seq, cantidadMin: "", precio: "" }])}>
          <Plus /> Agregar escala
        </Button>
      </div>
    </div>
  );
}
