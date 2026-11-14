import Link from "next/link";
import { getTenant } from "@/lib/auth";
import { productosOpcion } from "@/lib/lineas";
import { toNum } from "@/lib/utils";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { LineasEditor } from "@/components/lineas-editor";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guardarOrden } from "./actions";

type OrdenEditable = {
  id: number;
  proveedorId: number;
  depositoId: number;
  observacion: string | null;
  lineas: { productoId: number; cantidad: unknown; costo: unknown }[];
};

export async function OrdenForm({ orden }: { orden?: OrdenEditable }) {
  const { db } = await getTenant();
  const [proveedores, depositos, productos] = await Promise.all([
    db.contacto.findMany({ where: { esProveedor: true, activo: true }, orderBy: { nombre: "asc" } }),
    db.deposito.findMany({ where: { activo: true }, orderBy: { id: "asc" } }),
    productosOpcion(),
  ]);

  return (
    <ActionForm action={guardarOrden} className="grid gap-6">
      <input type="hidden" name="id" value={orden?.id ?? ""} />
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Proveedor">
            <NativeSelect name="proveedorId" defaultValue={orden?.proveedorId ?? ""} required>
              <option value="" disabled>Elegí un proveedor…</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Depósito de recepción">
            <NativeSelect name="depositoId" defaultValue={orden?.depositoId ?? depositos[0]?.id} required>
              {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Observación"><Input name="observacion" defaultValue={orden?.observacion ?? ""} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
        <CardContent>
          <LineasEditor
            modo="compra"
            productos={productos}
            iniciales={orden?.lineas.map((l) => ({ productoId: l.productoId, cantidad: toNum(l.cantidad as number), precio: toNum(l.costo as number) }))}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SubmitButton name="accion" value="confirmar">Guardar y confirmar</SubmitButton>
        <SubmitButton name="accion" value="borrador" variant="outline">Guardar borrador</SubmitButton>
        <Button variant="ghost" asChild><Link href="/compras/ordenes">Cancelar</Link></Button>
      </div>
    </ActionForm>
  );
}
