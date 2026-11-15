import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // Permite subir imágenes de producto a través de Server Actions (default 1MB).
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  // Dominio de Vercel Blob para optimizar las imágenes con next/image.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
