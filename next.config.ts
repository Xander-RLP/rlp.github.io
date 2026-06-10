import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // static export voor GitHub Pages; in dev uit zodat de API-proxy (rewrites) werkt
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  // mappen met index.html per route, zodat /schedule/ ook op statische hosts werkt
  trailingSlash: true,
  // dev-only: proxy de admin-API naar server.py (rewrites gelden niet in de export)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
