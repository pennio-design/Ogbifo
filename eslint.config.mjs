import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  { ignores: ["**/.next/**", "**/node_modules/**", "**/next-env.d.ts"] },
  ...nextVitals,
  ...nextTs,
  { settings: { next: { rootDir: "apps/web" } } },
];

export default config;
