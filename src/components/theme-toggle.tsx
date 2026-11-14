"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

/** Aplica la clase `.dark` al <html> según el tema elegido. */
function aplicarTema(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * `variant` ajusta los colores: "sidebar" para el fondo oscuro fijo del menú,
 * "surface" para superficies que siguen el tema (ej. el panel de login).
 */
export function ThemeToggle({ variant = "sidebar" }: { variant?: "sidebar" | "surface" }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [montado, setMontado] = useState(false);

  // Leer el tema inicial tras el montaje (evita desajustes de hidratación).
  useEffect(() => {
    const guardado = localStorage.getItem("theme");
    const inicial: Theme =
      guardado === "dark" || guardado === "light"
        ? guardado
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(inicial);
    setMontado(true);
  }, []);

  function alternar() {
    const siguiente: Theme = theme === "dark" ? "light" : "dark";
    setTheme(siguiente);
    localStorage.setItem("theme", siguiente);
    aplicarTema(siguiente);
  }

  const oscuro = montado && theme === "dark";
  const esSidebar = variant === "sidebar";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={oscuro}
      aria-label="Cambiar tema"
      title={oscuro ? "Tema oscuro" : "Tema claro"}
      onClick={alternar}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        esSidebar
          ? oscuro
            ? "border-transparent bg-sidebar-accent"
            : "border-transparent bg-sidebar-accent/40"
          : oscuro
            ? "border-transparent bg-primary"
            : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full bg-white text-foreground shadow-sm transition-transform",
          oscuro ? "translate-x-6" : "translate-x-1",
        )}
      >
        {oscuro ? <Moon className="size-3" /> : <Sun className="size-3" />}
      </span>
    </button>
  );
}
