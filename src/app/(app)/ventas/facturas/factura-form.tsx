import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { productosOpcion } from "@/lib/lineas";
import { toNum } from "@/lib/utils";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { LineasEditor } from "@/components/lineas-editor";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guardarFactura } from "./actions";

type FacturaEditable = {
  id: number;
  clienteId: number;
  depositoId: number;
  condicion: string;
  observacion: string | null;
  lineas: { productoId: number; cantidad: unknown; precioUnitario: unknown }[];
};

export async function FacturaForm({ factura }: { factura?: FacturaEditable }) {
  const [clientes, depositos, productos] = await Promise.all([
    prisma.contacto.findMany({ where: { esCliente: true, activo: true }, orderBy: { nombre: "asc" } }),
    prisma.deposito.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
    productosOpcion(),
  ]);

  return (
    <ActionForm action={guardarFactura} className="grid gap-6">
      <input type="hidden" name="id" value={factura?.id ?? ""} />
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cliente" className="sm:col-span-2">
            <NativeSelect name="clienteId" defaultValue={factura?.clienteId ?? clientes[0]?.id ?? ""} required>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.ruc ? ` — ${c.ruc}` : ""}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Depósito de salida">
            <NativeSelect name="depositoId" defaultValue={factura?.depositoId ?? depositos[0]?.id} required>
              {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Condición">
            <NativeSelect name="condicion" defaultValue={factura?.condicion ?? "CONTADO"}>
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </NativeSelect>
          </Field>
          <Field label="Observación" className="sm:col-span-2 lg:col-span-4">
            <Input name="observacion" defaultValue={factura?.observacion ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detalle</CardTitle></CardHeader>
        <CardContent>
          <LineasEditor
            modo="venta"
            productos={productos}
            iniciales={factura?.lineas.map((l) => ({ productoId: l.productoId, cantidad: toNum(l.cantidad as number), precio: toNum(l.precioUnitario as number) }))}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SubmitButton name="accion" value="emitir">Guardar y emitir</SubmitButton>
        <SubmitButton name="accion" value="borrador" variant="outline">Guardar borrador</SubmitButton>
        <Button variant="ghost" asChild><Link href="/ventas/facturas">Cancelar</Link></Button>
      </div>
    </ActionForm>
  );
}
