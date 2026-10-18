// Writes dist/sl-vortex-extension-<version>.zip from the build in dist/.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

import { zipSync } from "fflate";

import { archiveEntries } from "./archive.mjs";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

const entries = archiveEntries(readdirSync(dist, { recursive: true }).map((f) => String(f).replaceAll("\\", "/")));
const zip = zipSync(Object.fromEntries(entries.map((e) => [e, readFileSync(new URL(e, dist))])));
const name = `${pkg.name}-${pkg.version}.zip`;
writeFileSync(new URL(name, dist), zip);
console.log(`Wrote dist/${name}: ${entries.join(", ")}`);
