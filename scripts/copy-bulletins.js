import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("bulletins");
const destination = resolve("dist", "bulletins");

await mkdir(resolve("dist"), { recursive: true });
await cp(source, destination, { recursive: true });
console.log("Copied bulletin archive to dist/bulletins.");
