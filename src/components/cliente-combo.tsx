"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { crearClienteRapido, lookupRuc } from "@/app/(app)/contactos-actions";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { Modal } from "@/components/ui/modal";
import { Field, SubmitButton } from "@/components/form";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Combo de cliente con búsqueda y alta rápida (con autocompletado por RUC). */
export function ClienteCombo({
  clientes,
  defaultValue,
}: {
  clientes: ComboOption[];
  defaultValue: string;
}) {
  const [opciones, setOpciones] = React.useState(clientes);
  const [value, setValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);

  // Campos controlados del alta rápida (para poder autocompletarlos).
  const [nombre, setNombre] = React.useState("");
  const [ruc, setRuc] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [direccion, setDireccion] = React.useState("");

  const [rucMsg, setRucMsg] = React.useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [buscando, setBuscando] = React.useState(false);

  const [state, formAction] = useActionState(crearClienteRapido, {});
  const procesado = React.useRef<number | null>(null);

  // Cuando el alta funciona, sumamos el cliente al combo y lo seleccionamos.
  React.useEffect(() => {
    const c = state.cliente;
    if (c && procesado.current !== c.id) {
      procesado.current = c.id;
      setOpciones((o) =>
        o.some((x) => x.value === String(c.id))
          ? o
          : [{ value: String(c.id), label: c.label, keywords: c.label }, ...o],
      );
      setValue(String(c.id));
      setOpen(false);
    }
  }, [state]);

  const abrir = (q: string) => {
    // Si lo buscado parece un RUC, lo ponemos en RUC; si no, en nombre.
    const pareceRuc = /^[\d.\s-]+$/.test(q) && /\d/.test(q);
    setNombre(pareceRuc ? "" : q);
    setRuc(pareceRuc ? q.trim() : "");
    setTelefono("");
    setEmail("");
    setDireccion("");
    setRucMsg(null);
    setOpen(true);
  };

  const traerPorRuc = async () => {
    if (!ruc.trim() || buscando) return;
    setBuscando(true);
    setRucMsg(null);
    try {
      const r = await lookupRuc(ruc.trim());
      if (r.ok) {
        if (r.nombre) setNombre(r.nombre);
        if (r.fullRuc) setRuc(r.fullRuc);
        if (r.ciudad && !direccion) setDireccion(r.ciudad);
        setRucMsg({ tipo: "ok", texto: "Datos traídos de la DNIT. Revisá y completá teléfono/email." });
      } else {
        setRucMsg({ tipo: "error", texto: r.error ?? "No se encontraron datos." });
      }
    } catch {
      setRucMsg({ tipo: "error", texto: "No se pudo consultar el RUC." });
    } finally {
      setBuscando(false);
    }
  };

  return (
    <>
      <Combobox
        name="clienteId"
        value={value}
        onChange={setValue}
        options={opciones}
        placeholder="Elegí un cliente…"
        searchPlaceholder="Buscar por nombre o RUC…"
        createLabel="Nuevo cliente"
        onCreate={abrir}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo cliente">
        <form action={formAction} className="grid gap-4">
          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <Field label="RUC / CI" hint="Ej. 80012345-6 · traé los datos de la DNIT">
            <div className="flex gap-2">
              <Input
                name="ruc"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    traerPorRuc();
                  }
                }}
                placeholder="80012345-6"
              />
              <Button type="button" variant="outline" onClick={traerPorRuc} disabled={buscando || !ruc.trim()}>
                {buscando ? <Loader2 className="animate-spin" /> : <Search />}
                Traer datos
              </Button>
            </div>
          </Field>
          {rucMsg && (
            <p className={rucMsg.tipo === "ok" ? "text-xs text-success" : "text-xs text-destructive"}>
              {rucMsg.texto}
            </p>
          )}

          <Field label="Nombre o razón social">
            <Input name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono"><Input name="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Field>
            <Field label="Email"><Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          </div>
          <Field label="Dirección"><Textarea name="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Field>

          <div className="flex gap-2">
            <SubmitButton>Guardar cliente</SubmitButton>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
