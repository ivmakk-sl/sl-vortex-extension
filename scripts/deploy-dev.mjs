// Copies the build into the Vortex plugins folder of this user. Restart Vortex to load it.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const appData = process.env.APPDATA;
if (!appData) throw new Error("APPDATA is not set: the dev deploy runs on Windows only");
// The folder of a Vortex install from Nexus (the info.json id), so a dev build replaces it.
const target = join(appData, "Vortex", "plugins", "survivallog");

if (existsSync(target)) rmSync(target, { recursive: true });
mkdirSync(target, { recursive: true });
for (const name of readdirSync(dist)) {
  if (name.endsWith(".zip")) continue;
  cpSync(join(dist, name), join(target, name), { recursive: true });
}
console.log(`Deployed to ${target}`);
