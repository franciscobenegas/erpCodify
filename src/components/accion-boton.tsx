"use client";

import { ActionForm, SubmitButton } from "@/components/form";
import type { ActionState } from "@/lib/action";
import type { Button } from "@/components/ui/button";

/** Botón que ejecuta una server action ya "bindeada" (ej. emitirFactura.bind(null, id)). */
export function AccionBoton({
  action,
  children,
  confirm,
  variant,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  confirm?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <ActionForm action={action} confirm={confirm}>
      <SubmitButton variant={variant}>{children}</SubmitButton>
    </ActionForm>
  );
}
