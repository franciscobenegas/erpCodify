import { Sidebar } from "@/components/sidebar";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  return (
    <div className="min-h-dvh">
      <Sidebar usuario={{ nombre: s.nombre, rol: s.rol }} permisos={s.permisos} logout={logout} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
