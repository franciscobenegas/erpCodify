"use client";

import { useState } from "react";
import { Field } from "@/components/form";
import { NativeSelect } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineasEditor, type ProductoOpcion, type LineaInicial, type ImportResult } from "@/components/lineas-editor";
import { PagosEditor, type FormaPagoOpcion, type PagoInicial } from "@/components/pagos-editor";

/**
 * Agrupa el detalle de líneas y las formas de pago de una venta. Vive en el
 * cliente porque la condición (contado/crédito) y el total se comparten entre
 * ambos editores: las formas de pago solo aparecen al contado y validan el total.
 */
export function VentaDetalle({
  productos,
  formas,
  importAction,
  lineasIniciales,
  condicionInicial,
  pagosIniciales,
}: {
  productos: ProductoOpcion[];
  formas: FormaPagoOpcion[];
  importAction: (fd: FormData) => Promise<ImportResult>;
  lineasIniciales?: LineaInicial[];
  condicionInicial: "CONTADO" | "CREDITO";
  pagosIniciales?: PagoInicial[];
}) {
  const [condicion, setCondicion] = useState<"CONTADO" | "CREDITO">(condicionInicial);
  const [total, setTotal] = useState(0);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader><CardTitle>Detalle</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="max-w-[12rem]">
            <Field label="Condición">
              <NativeSelect name="condicion" value={condicion} onChange={(e) => setCondicion(e.target.value as "CONTADO" | "CREDITO")}>
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </NativeSelect>
            </Field>
          </div>
          <LineasEditor modo="venta" productos={productos} importAction={importAction} iniciales={lineasIniciales} onTotal={setTotal} />
        </CardContent>
      </Card>

      {condicion === "CONTADO" && (
        <Card>
          <CardHeader><CardTitle>Formas de pago</CardTitle></CardHeader>
          <CardContent>
            <PagosEditor total={total} formas={formas} iniciales={pagosIniciales} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
