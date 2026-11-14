"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

/**
 * Marco de la app autenticada. Coordina el estado "colapsado" del sidebar
 * (modo rail, solo iconos) con el padding del contenido principal.
 */
export function AppShell({
  usuario,
  permisos,
  esSuperAdmin = false,
  logout,
  children,
}: {
  usuario: { nombre: string; rol: string };
  permisos: string[];
  esSuperAdmin?: boolean;
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [colapsado, setColapsado] = useState(false);

  // Recuperar la preferencia tras el montaje (localStorage no existe en el server).
  useEffect(() => {
    setColapsado(localStorage.getItem("sidebar-colapsado") === "1");
  }, []);

  function alternar() {
    setColapsado((c) => {
      const n = !c;
      localStorage.setItem("sidebar-colapsado", n ? "1" : "0");
      return n;
    });
  }

  return (
    <div className="min-h-dvh">
      <Sidebar
        usuario={usuario}
        permisos={permisos}
        esSuperAdmin={esSuperAdmin}
        logout={logout}
        colapsado={colapsado}
        onToggleColapsar={alternar}
      />
      <main className={cn("transition-[padding] duration-200", colapsado ? "lg:pl-20" : "lg:pl-64")}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
