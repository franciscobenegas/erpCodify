import "server-only";

export type RucLookup = {
  ok: boolean;
  /** Razón social / nombre del contribuyente. */
  nombre?: string;
  ruc?: string;
  dv?: string;
  /** RUC-DV normalizado. */
  fullRuc?: string;
  ciudad?: string;
  error?: string;
};

/** Normaliza "800123456", "80012345-6", "80.012.345-6" → "80012345-6". */
function normalizar(input: string): { fullRuc: string; ruc: string; dv: string } | null {
  const limpio = input.replace(/[.\s]/g, "").trim();
  let m = /^(\d{3,10})-(\d)$/.exec(limpio);
  if (!m) {
    const solo = /^(\d{4,11})$/.exec(limpio);
    if (!solo) return null;
    const n = solo[1];
    m = [limpio, n.slice(0, -1), n.slice(-1)] as unknown as RegExpExecArray;
  }
  return { ruc: m[1], dv: m[2], fullRuc: `${m[1]}-${m[2]}` };
}

/**
 * Consulta un RUC de Paraguay en el servicio público gratuito ruc.sun.com.py
 * (datos de la DNIT/SET). Best-effort: ante error o límite de uso devuelve
 * { ok:false } para que el alta pueda completarse manualmente.
 * Si se define RUC_API_KEY, se envía como X-API-Key para mayor volumen.
 */
export async function consultarRuc(input: string): Promise<RucLookup> {
  const norm = normalizar(input);
  if (!norm) return { ok: false, error: "RUC inválido. Usá el formato 80012345-6." };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://ruc.sun.com.py/api/ruc/${norm.fullRuc}`, {
      headers: {
        Accept: "application/json",
        ...(process.env.RUC_API_KEY ? { "X-API-Key": process.env.RUC_API_KEY } : {}),
      },
      signal: ctrl.signal,
      cache: "no-store",
    });

    if (res.status === 429) {
      return { ok: false, error: "El servicio de consulta está saturado. Probá en unos minutos o cargá los datos a mano." };
    }

    const json: unknown = await res.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return { ok: false, error: "No se pudo leer la respuesta del servicio de RUC." };
    }

    const obj = json as Record<string, unknown>;
    if (obj.ok === false) {
      const err = String(obj.error ?? "");
      if (/limit|too many/i.test(err)) {
        return { ok: false, error: "El servicio de consulta está saturado. Probá en unos minutos o cargá los datos a mano." };
      }
      return { ok: false, error: "RUC no encontrado." };
    }

    // La respuesta puede venir directa o envuelta en { data: {...} }.
    const d = (obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj);
    const nombre = (d.name ?? d.razonSocial ?? d.nombre) as string | undefined;
    if (!nombre) return { ok: false, error: "RUC no encontrado." };

    const siara = d.siara && typeof d.siara === "object" ? (d.siara as Record<string, unknown>) : undefined;

    return {
      ok: true,
      nombre: String(nombre).trim(),
      ruc: (d.ruc as string) ?? norm.ruc,
      dv: (d.dv as string) ?? norm.dv,
      fullRuc: (d.fullRuc as string) ?? norm.fullRuc,
      ciudad: siara?.ciudad ? String(siara.ciudad) : undefined,
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "La consulta tardó demasiado. Cargá los datos a mano." };
    }
    return { ok: false, error: "No se pudo conectar con el servicio de RUC." };
  } finally {
    clearTimeout(timer);
  }
}
