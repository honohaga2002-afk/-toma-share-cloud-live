import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "dist");
const excluded = new Set([
  ".git", ".github", ".vercel", "api", "dist", "node_modules",
  "package.json", "package-lock.json", "vercel.json",
  "build-static.mjs", "README.md"
]);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name) || entry.name.startsWith(".")) continue;
  await cp(join(root, entry.name), join(out, entry.name), {
    recursive: true,
    force: true
  });
}
console.log("TOMA SHARE static files copied to dist");
