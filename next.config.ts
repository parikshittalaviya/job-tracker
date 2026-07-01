import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mammoth', 'pdfkit', 'unpdf'],
};

export default nextConfig;
