import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mammoth', 'pdfmake', 'unpdf'],
};

export default nextConfig;
