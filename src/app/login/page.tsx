import { Boxes } from "lucide-react";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Input } from "@/components/ui/input";
import { login } from "./actions";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">ERP</h1>
            <p className="text-sm text-muted-foreground">Inventario · Ventas · Compras</p>
          </div>
        </div>
        <ActionForm action={login} className="grid gap-4 rounded-xl border bg-card p-6 shadow-sm">
          <input type="hidden" name="next" value={next ?? "/"} />
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Field label="Contraseña" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <SubmitButton className="mt-2 w-full">Ingresar</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
