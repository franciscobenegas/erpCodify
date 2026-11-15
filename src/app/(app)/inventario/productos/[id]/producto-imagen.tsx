"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Campo de imagen del producto con previsualización instantánea y etiquetas en
 * español. Oculta el input nativo (cuyo "Choose file / No file chosen" no se puede
 * traducir) y usa una etiqueta propia. Conserva name="imagen" y name="quitarImagen"
 * para que la server action los reciba igual.
 */
export function ProductoImagen({ actual, nombre }: { actual?: string | null; nombre?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [quitar, setQuitar] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
    setFileName(f?.name ?? "");
    if (f) setQuitar(false);
  }

  // Qué imagen mostrar: la recién elegida (preview) o la actual, salvo que se haya marcado "quitar".
  const mostrar = preview ?? (quitar ? null : actual ?? null);

  return (
    <div className="grid gap-2">
      {mostrar && (
        <Image
          src={mostrar}
          alt={nombre ?? "Imagen del producto"}
          width={96}
          height={96}
          unoptimized={!!preview}
          className="size-24 rounded-md border object-cover"
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
          {mostrar ? "Cambiar imagen" : "Elegir imagen"}
          <input type="file" name="imagen" accept="image/*" onChange={onChange} className="sr-only" />
        </label>
        <span className="text-sm text-muted-foreground">{fileName || "Ningún archivo seleccionado"}</span>
      </div>
      {actual && !preview && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="quitarImagen"
            checked={quitar}
            onChange={(e) => setQuitar(e.target.checked)}
            className="size-4"
          />
          Quitar imagen
        </label>
      )}
    </div>
  );
}
