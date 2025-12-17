import type { IncomingMessage, ServerResponse } from "http";
import type { Plugin, ViteDevServer } from "vite";
import { defineConfig } from "vite";

const normalizePath = (path: string): string => (path === "/" ? "/" : path.replace(/\/+$/, ""));

const rootPathMiddleware = (): Plugin => ({
  name: "root-path-check",
  configureServer(server: ViteDevServer) {
    server.middlewares.use(
      (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
        if (!req.url) {
          next();
          return;
        }

        const [pathname] = req.url.split("?");
        const basePath = normalizePath(server.config.base || "/");
        const requestPath = normalizePath(pathname || "/");
        if (requestPath === basePath) {
          res.setHeader("x-root-request", "true");
        }

        next();
      }
    );
  },
});

const basePath = process.env.VITE_BASE_URL ?? "/";

export default defineConfig({
  base: basePath,
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [rootPathMiddleware()],
});
