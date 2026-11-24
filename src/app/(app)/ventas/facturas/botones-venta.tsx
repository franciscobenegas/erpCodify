"use client";

import { useRef } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botones de guardado de la venta. La intención (emitir vs. borrador) viaja en un
 * input oculto que se fija en el onClick —sincrónico, antes del submit— en lugar
 * de depender del name/value del botón, que se pierde cuando el submitter queda
 * deshabilitado durante el envío.
 */
export function BotonesVenta() {
  const accion = useRef<HTMLInputElement>(null);
  const { pending } = useFormStatus();
  const set = (v: string) => { if (accion.current) accion.current.value = v; };

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="accion" ref={accion} defaultValue="borrador" />
      <Button type="submit" disabled={pending} onClick={() => set("emitir")}>
        {pending && <Loader2 className="animate-spin" />} Guardar y emitir
      </Button>
      <Button type="submit" variant="outline" disabled={pending} onClick={() => set("borrador")}>
        Guardar borrador
      </Button>
      <Button variant="ghost" asChild><Link href="/ventas/facturas">Cancelar</Link></Button>
    </div>
  );
}
