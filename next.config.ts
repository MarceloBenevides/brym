import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Importação de clientes por CSV: o default de 1MB é apertado.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
