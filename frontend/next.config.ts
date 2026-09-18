import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: required for the Capacitor Android (APK) build.
  // The app is fully client-side (no server actions / API routes / middleware),
  // so export works with no behavior change on the web deployment.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
