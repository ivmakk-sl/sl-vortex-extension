// Writes dist/info.json from package.json and copies the game art next to the compiled index.js.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { makeInfo } from "./info.mjs";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

mkdirSync(dist, { recursive: true });
writeFileSync(new URL("info.json", dist), JSON.stringify(makeInfo(pkg), null, 2) + "\n");
copyFileSync(new URL("assets/gameart.jpg", root), new URL("gameart.jpg", dist));
