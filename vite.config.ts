import { defineConfig, loadEnv } from "vite";

const normalizeBase = (value: string | undefined) => {
  const candidate = value ?? "/";
  if (!candidate) {
    return "/";
  }

  try {
    const url = new URL(candidate);
    const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return pathname === "//" ? "/" : pathname;
  } catch {
    const withLeading = candidate.startsWith("/") ? candidate : `/${candidate}`;
    return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const baseEnv =
    env.GH_PAGES_BASE ??
    env.VITE_BASE_URL ??
    process.env.GH_PAGES_BASE ??
    process.env.VITE_BASE_URL;
  const base = normalizeBase(baseEnv);

  return {
    root: ".",
    base,
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
