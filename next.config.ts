import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
  i18n: {
    locales: ['en', 'es', 'zh', 'tl', 'vi'],
    defaultLocale: 'en',
  },
};

export default nextConfig;
