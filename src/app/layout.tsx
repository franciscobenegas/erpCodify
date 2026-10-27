import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ERP", template: "%s · ERP" },
  description: "ERP de inventario, ventas y compras",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "Inter, ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif" }}>{children}</body>
    </html>
  );
}
