import Link from "next/link";
import { getTenant } from "@/lib/auth";
import { productosOpcion } from "@/lib/lineas";
import { toNum } from "@/lib/utils";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { ClienteCombo } from "@/components/cliente-combo";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TIPOS_COMPROBANTE } from "@/lib/comprobante";
import { VentaDetalle } from "./venta-detalle";
import { guardarFactura, importarItemsFactura } from "./actions";

type FacturaEditable = {
  id: number;
  clienteId: number;
  depositoId: number;
  tipoComprobante: string;
  condicion: string;
  observacion: string | null;
  lineas: { productoId: number; cantidad: unknown; precioUnitario: unknown; descuento: unknown }[];
  pagos: { formaPagoId: number; monto: unknown }[];
};

export async function FacturaForm({ factura }: { factura?: FacturaEditable }) {
  const { db } = await getTenant();
  const [clientes, depositos, productos, formasPago] = await Promise.all([
    db.contacto.findMany({ where: { esCliente: true, activo: true }, orderBy: { nombre: "asc" } }),
    db.deposito.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
    productosOpcion("venta"),
    db.formaPago.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, include: { cuenta: { select: { id: true, nombre: true } } } }),
  ]);

  const formas = formasPago.map((f) => ({ id: f.id, nombre: f.nombre, cuentaId: f.cuentaId, cuentaNombre: f.cuenta?.nombre ?? null }));

  return (
    <ActionForm action={guardarFactura} className="grid gap-6">
      <input type="hidden" name="id" value={factura?.id ?? ""} />
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cliente" className="sm:col-span-2">
            <ClienteCombo
              defaultValue={String(factura?.clienteId ?? clientes[0]?.id ?? "")}
              clientes={clientes.map((c) => ({
                value: String(c.id),
                label: `${c.nombre}${c.ruc ? ` — ${c.ruc}` : ""}`,
                keywords: `${c.nombre} ${c.ruc ?? ""}`,
              }))}
            />
          </Field>
          <Field label="Tipo de comprobante">
            <NativeSelect name="tipoComprobante" defaultValue={factura?.tipoComprobante ?? "FACTURA"}>
              {TIPOS_COMPROBANTE.map((t) => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Depósito de salida">
            <NativeSelect name="depositoId" defaultValue={factura?.depositoId ?? depositos[0]?.id} required>
              {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Observación" className="sm:col-span-2 lg:col-span-4">
            <Input name="observacion" defaultValue={factura?.observacion ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <VentaDetalle
        productos={productos}
        formas={formas}
        importAction={importarItemsFactura}
        condicionInicial={(factura?.condicion as "CONTADO" | "CREDITO") ?? "CONTADO"}
        lineasIniciales={factura?.lineas.map((l) => ({ productoId: l.productoId, cantidad: toNum(l.cantidad as number), precio: toNum(l.precioUnitario as number), descuento: toNum(l.descuento as number) }))}
        pagosIniciales={factura?.pagos.map((p) => ({ formaPagoId: p.formaPagoId, monto: toNum(p.monto as number) }))}
      />

      <div className="flex flex-wrap gap-2">
        <SubmitButton name="accion" value="emitir">Guardar y emitir</SubmitButton>
        <SubmitButton name="accion" value="borrador" variant="outline">Guardar borrador</SubmitButton>
        <Button variant="ghost" asChild><Link href="/ventas/facturas">Cancelar</Link></Button>
      </div>
    </ActionForm>
  );
}
