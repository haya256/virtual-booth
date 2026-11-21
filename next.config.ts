import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // content/ は実行時に fs で読む（knowledge/ や images/ はディレクトリごと走査する）ため、
  // Vercel などのサーバーレス環境でもファイル一式がバンドルに含まれるよう明示する。
  outputFileTracingIncludes: {
    "/": ["./content/**/*"],
    "/api/chat": ["./content/**/*", "./README.md"],
    "/pamphlet": ["./content/**/*"],
    "/booth-assets/[name]": ["./content/images/**/*"],
  },
};

export default nextConfig;
