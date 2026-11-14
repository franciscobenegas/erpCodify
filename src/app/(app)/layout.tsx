import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  return (
    <AppShell usuario={{ nombre: s.nombre, rol: s.rol }} permisos={s.permisos} esSuperAdmin={s.esSuperAdmin} logout={logout}>
      {children}
    </AppShell>
  );
}
