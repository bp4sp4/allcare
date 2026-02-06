import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: false, // 개발 환경에서 이중 렌더링 방지
};

export default nextConfig;
