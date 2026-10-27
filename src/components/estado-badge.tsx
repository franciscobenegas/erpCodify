import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "secondary" | "success" | "destructive" | "default" | "warning" }> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDA: { label: "Emitida", variant: "success" },
  ANULADA: { label: "Anulada", variant: "destructive" },
  CONFIRMADA: { label: "Confirmada", variant: "default" },
  RECIBIDA: { label: "Recibida", variant: "success" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
};

export function EstadoBadge({ estado }: { estado: string }) {
  const m = MAP[estado] ?? { label: estado, variant: "secondary" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
