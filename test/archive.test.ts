import { describe, expect, it } from "vitest";

import { archiveEntries } from "../scripts/archive.mjs";

describe("archiveEntries", () => {
  const dist = [
    "common.js",
    "gameart.jpg",
    "index.js",
    "index.js.map",
    "index.d.ts",
    "info.json",
    "installers.js",
    "pack.js",
    "sl-vortex-extension-0.1.0.zip",
    "node_modules/x/index.js",
  ];

  it("puts info.json, index.js, and gameart.jpg at the root", () => {
    const entries = archiveEntries(dist);
    for (const name of ["info.json", "index.js", "gameart.jpg"]) expect(entries).toContain(name);
    expect(entries.every((e: string) => !e.includes("/"))).toBe(true);
  });

  it("keeps the other compiled files and leaves out maps, type files, node_modules, and earlier archives", () => {
    expect(archiveEntries(dist)).toEqual(["common.js", "gameart.jpg", "index.js", "info.json", "installers.js", "pack.js"]);
  });
});
