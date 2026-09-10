import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const archiveFolders = ["bulletins", "newsletters"];

await mkdir(resolve("dist"), { recursive: true });
for (const folder of archiveFolders) {
  await cp(resolve(folder), resolve("dist", folder), { recursive: true });
  console.log(`Copied ${folder} archive to dist/${folder}.`);
}
