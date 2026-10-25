import type { NextConfig } from "next";
const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
const config: NextConfig = {
  ...(staticExport
    ? {
        output: "export",
        trailingSlash: true,
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/fitlead-ai",
        images: { unoptimized: true },
      }
    : {}),
  async rewrites() {
    return staticExport
      ? []
      : [
          {
            source: "/api/:path*",
            destination: `${process.env.API_URL || "http://127.0.0.1:8000"}/api/:path*`,
          },
        ];
  },
  devIndicators: false,
};
export default config;
