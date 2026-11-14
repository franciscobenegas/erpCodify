import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ERP", template: "%s · ERP" },
  description: "ERP de inventario, ventas y compras",
};

// Se ejecuta antes del primer render para aplicar el tema guardado y evitar el
// parpadeo (FOUC) de claro→oscuro. Lee "theme" de localStorage; si no hay valor
// o es "system", sigue la preferencia del sistema operativo.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: "Inter, ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif" }}>{children}</body>
    </html>
  );
}
