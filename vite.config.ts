import { defineConfig } from "vite";

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

const base = normalizeBase(process.env.GH_PAGES_BASE ?? process.env.VITE_BASE_URL);

export default defineConfig({
  root: ".",
  base,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
