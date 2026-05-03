import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack lee los paths de tsconfig.json automáticamente.
  // La sección vacía silencia el warning de conflicto webpack/turbopack.
  turbopack: {},
};

export default nextConfig;
