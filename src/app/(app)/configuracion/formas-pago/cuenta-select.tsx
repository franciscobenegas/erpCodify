"use client";

import { useState, useTransition } from "react";
import { NativeSelect } from "@/components/ui/input";
import { setCuentaFormaPago } from "./actions";

type Cuenta = { id: number; nombre: string };

/** Select inline que guarda la cuenta destino de una forma de pago al cambiar. */
export function CuentaSelect({ formaId, cuentaId, cuentas }: { formaId: number; cuentaId: number | null; cuentas: Cuenta[] }) {
  const [valor, setValor] = useState(cuentaId == null ? "" : String(cuentaId));
  const [guardando, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        className="w-44"
        value={valor}
        disabled={guardando}
        onChange={(e) => {
          const v = e.target.value;
          setValor(v);
          setError(null);
          start(async () => {
            const r = await setCuentaFormaPago(formaId, v === "" ? null : Number(v));
            if (r?.error) {
              setError(r.error);
              setValor(cuentaId == null ? "" : String(cuentaId)); // revierte
            }
          });
        }}
      >
        <option value="">— Sin cuenta —</option>
        {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </NativeSelect>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
