import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@ogbifo/ui", "@ogbifo/domain"],
  reactStrictMode: true,
};

export default config;
