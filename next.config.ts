import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // static export voor GitHub Pages
  output: "export",
  // mappen met index.html per route, zodat /schedule/ ook op statische hosts werkt
  trailingSlash: true,
};

export default nextConfig;
