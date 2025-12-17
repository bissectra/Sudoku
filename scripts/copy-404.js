import { copyFileSync } from "fs";
import { resolve } from "path";

const distPath = resolve(process.cwd(), "dist");
const indexFile = resolve(distPath, "index.html");
const fallbackFile = resolve(distPath, "404.html");

try {
  copyFileSync(indexFile, fallbackFile);
  console.log("Copied index.html to 404.html for SPA routing on GitHub Pages.");
} catch (error) {
  console.error("Unable to copy index.html to 404.html:", error);
  process.exit(1);
}
