import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Keep the Tailwind v4 native toolchain out of the Turbopack bundle, the
     Windows native binaries only load from plain node_modules require */
  serverExternalPackages: [
    "@tailwindcss/postcss",
    "@tailwindcss/node",
    "@tailwindcss/oxide",
    "lightningcss",
  ],
};

export default nextConfig;
