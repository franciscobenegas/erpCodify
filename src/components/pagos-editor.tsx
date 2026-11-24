"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { formatGs } from "@/lib/utils";

export type FormaPagoOpcion = { id: number; nombre: string; cuentaId: number | null; cuentaNombre: string | null };
export type PagoInicial = { formaPagoId: number; monto: number };

type Pago = { key: number; formaPagoId: number; monto: number };
let pseq = 0;

/**
 * Editor de formas de pago para una venta al contado. La suma debe igualar el
 * total (lo valida el servidor al emitir). Solo lista medios con cuenta destino.
 * Emite las líneas en un input oculto "pagos" (JSON).
 */
export function PagosEditor({ total, formas, iniciales }: { total: number; formas: FormaPagoOpcion[]; iniciales?: PagoInicial[] }) {
  const usables = formas.filter((f) => f.cuentaId != null);
  const porId = new Map(usables.map((f) => [f.id, f]));
  const [pagos, setPagos] = useState<Pago[]>(() =>
    iniciales && iniciales.length
      ? iniciales.map((p) => ({ key: ++pseq, ...p }))
      : [{ key: ++pseq, formaPagoId: usables[0]?.id ?? 0, monto: 0 }],
  );
  // Si ya hay pagos cargados (edición de borrador) se respetan; si no, el monto sigue al total.
  const [touched, setTouched] = useState(Boolean(iniciales && iniciales.length));

  // Default cómodo: con una sola línea sin tocar, el monto acompaña al total.
  useEffect(() => {
    if (!touched) setPagos((ps) => (ps.length === 1 ? [{ ...ps[0], monto: total }] : ps));
  }, [total, touched]);

  const edit = (key: number, patch: Partial<Pago>) => {
    setTouched(true);
    setPagos((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };

  const validos = pagos.filter((p) => p.formaPagoId > 0 && p.monto > 0);
  const pagado = validos.reduce((a, p) => a + p.monto, 0);
  const falta = Math.round(total - pagado);

  if (usables.length === 0) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
        No hay formas de pago con cuenta destino. Configuralas en{" "}
        <Link href="/configuracion/formas-pago" className="font-medium underline">Configuración → Formas de pago</Link>.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name="pagos" value={JSON.stringify(validos.map((p) => ({ formaPagoId: p.formaPagoId, monto: Math.round(p.monto) })))} />

      {pagos.map((p) => {
        const f = porId.get(p.formaPagoId);
        return (
          <div key={p.key} className="grid grid-cols-[1fr_160px_40px] items-center gap-2">
            <div>
              <NativeSelect value={p.formaPagoId || ""} aria-label="Forma de pago" onChange={(e) => edit(p.key, { formaPagoId: Number(e.target.value) })}>
                <option value="" disabled>Elegí una forma…</option>
                {usables.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </NativeSelect>
              {f?.cuentaNombre && <div className="mt-0.5 text-xs text-muted-foreground">→ {f.cuentaNombre}</div>}
            </div>
            <Input type="number" min={0} step="1" className="text-right" aria-label="Monto" value={p.monto || ""} placeholder="0" onChange={(e) => edit(p.key, { monto: Number(e.target.value) })} />
            <Button type="button" variant="ghost" size="icon" aria-label="Quitar forma" onClick={() => setPagos((ps) => (ps.length > 1 ? ps.filter((x) => x.key !== p.key) : ps))}>
              <Trash2 className="text-muted-foreground" />
            </Button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => { setTouched(true); setPagos((ps) => [...ps, { key: ++pseq, formaPagoId: usables[0]?.id ?? 0, monto: Math.max(0, falta) }]); }}>
          <Plus /> Agregar forma de pago
        </Button>
        {falta !== 0 && pagado > 0 && (
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => edit(pagos[pagos.length - 1].key, { monto: Math.max(0, pagos[pagos.length - 1].monto + falta) })}>
            Ajustar última al total
          </button>
        )}
      </div>

      <div className="ml-auto grid w-full max-w-xs gap-1 rounded-lg bg-muted/60 p-4 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Total de la venta</span><span>{formatGs(total)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Pagado</span><span>{formatGs(pagado)}</span></div>
        <div className="mt-1 flex justify-between border-t pt-2 font-medium">
          <span>{falta > 0 ? "Falta" : falta < 0 ? "Sobra" : "Cubierto"}</span>
          <span className={falta === 0 ? "text-success" : "text-destructive"}>{formatGs(Math.abs(falta))}</span>
        </div>
      </div>
    </div>
  );
}
