import * as path from "node:path";
import { describe, expect, it } from "vitest";

import {
  installBepInExLayout,
  installBepInExPack,
  installLooseDlls,
  installPluginFolder,
  testBepInExLayout,
  testBepInExPack,
  testLooseDlls,
  testPluginFolder,
} from "../src/installers";
import { PACK_ENTRIES } from "./fixtures/packEntries";

/** Vortex gives the archive entries with the separator of the OS, and a folder entry ends with it. */
const vortexList = (entries: readonly string[]) => entries.map((e) => e.split("/").join(path.sep));

const PACK = vortexList(PACK_ENTRIES);
const TRAPLINE = vortexList(["BepInEx/", "BepInEx/plugins/", "BepInEx/plugins/Trapline.dll"]);

describe("pack installer", () => {
  it("supports the pack zip for Survival Log only", async () => {
    expect((await testBepInExPack(PACK, "survivallog")).supported).toBe(true);
    expect((await testBepInExPack(PACK, "valheim")).supported).toBe(false);
  });

  it("does not support a mod zip", async () => {
    expect((await testBepInExPack(TRAPLINE, "survivallog")).supported).toBe(false);
  });

  it("copies each file of the pack unchanged, dotfiles included", async () => {
    const { instructions } = await installBepInExPack(PACK);
    const copies = instructions.filter((i) => i.type === "copy");
    const files = PACK.filter((e) => !e.endsWith(path.sep));
    expect(copies.map((c) => c.source)).toEqual(files);
    for (const c of copies) expect(c.destination).toBe(c.source);
    expect(files).toContain(".doorstop_version");
    expect(files).toContain(path.join("dotnet", ".version"));
  });

  it("generates no file, sets the injector mod type, and names the mod", async () => {
    const { instructions } = await installBepInExPack(PACK);
    expect(instructions.filter((i) => i.type === "generatefile")).toEqual([]);
    expect(instructions.filter((i) => i.type === "setmodtype")).toEqual([{ type: "setmodtype", value: "bepinex-injector" }]);
    const names = instructions.filter((i) => i.type === "attribute" && i.key === "customFileName");
    expect(names).toHaveLength(1);
  });
});

const copiesOf = (instructions: { type: string; source?: string; destination?: string }[]) =>
  instructions.filter((i) => i.type === "copy").map((i) => [i.source, i.destination]);
const modTypesOf = (instructions: { type: string; value?: unknown }[]) =>
  instructions.filter((i) => i.type === "setmodtype").map((i) => i.value);
const p = (entry: string) => entry.split("/").join(path.sep);

const NESTED = vortexList(["SomeMod-1.0/", "SomeMod-1.0/BepInEx/", "SomeMod-1.0/BepInEx/plugins/", "SomeMod-1.0/BepInEx/plugins/SomeMod.dll"]);
const FOLDER = vortexList(["SomeMod/", "SomeMod/SomeMod.dll", "SomeMod/assets.json"]);
const LOOSE = vortexList(["SomeMod.dll", "readme.txt"]);

describe("BepInEx layout installer", () => {
  it("installs a published mod zip into the plugins folder of BepInEx", async () => {
    expect((await testBepInExLayout(TRAPLINE, "survivallog")).supported).toBe(true);
    const { instructions } = await installBepInExLayout(TRAPLINE);
    expect(modTypesOf(instructions)).toEqual(["bepinex-root"]);
    expect(copiesOf(instructions)).toEqual([[p("BepInEx/plugins/Trapline.dll"), p("plugins/Trapline.dll")]]);
  });

  it("drops one top folder above BepInEx/", async () => {
    expect((await testBepInExLayout(NESTED, "survivallog")).supported).toBe(true);
    const { instructions } = await installBepInExLayout(NESTED);
    expect(copiesOf(instructions)).toEqual([[p("SomeMod-1.0/BepInEx/plugins/SomeMod.dll"), p("plugins/SomeMod.dll")]]);
  });

  it("puts a DLL next to BepInEx/ into the plugins folder and leaves out the other files there", async () => {
    const mixed = vortexList(["BepInEx/", "BepInEx/config/", "BepInEx/config/com.x.cfg", "MyMod.dll", "readme.txt"]);
    expect((await testBepInExLayout(mixed, "survivallog")).supported).toBe(true);
    const { instructions } = await installBepInExLayout(mixed);
    expect(copiesOf(instructions)).toEqual([
      [p("BepInEx/config/com.x.cfg"), p("config/com.x.cfg")],
      ["MyMod.dll", p("plugins/MyMod.dll")],
    ]);
    const nested = vortexList(["SomeMod-1.0/", "SomeMod-1.0/BepInEx/", "SomeMod-1.0/BepInEx/config/x.cfg", "SomeMod-1.0/SomeMod.dll"]);
    expect(copiesOf((await installBepInExLayout(nested)).instructions)).toEqual([
      [p("SomeMod-1.0/BepInEx/config/x.cfg"), p("config/x.cfg")],
      [p("SomeMod-1.0/SomeMod.dll"), p("plugins/SomeMod.dll")],
    ]);
  });

  it("does not support the pack zip or another game", async () => {
    expect((await testBepInExLayout(PACK, "survivallog")).supported).toBe(false);
    expect((await testBepInExLayout(TRAPLINE, "valheim")).supported).toBe(false);
  });
});

describe("plugin folder installer", () => {
  it("installs one top folder with a DLL into the plugins folder", async () => {
    expect((await testPluginFolder(FOLDER, "survivallog")).supported).toBe(true);
    const { instructions } = await installPluginFolder(FOLDER);
    expect(modTypesOf(instructions)).toEqual(["bepinex-plugin"]);
    expect(copiesOf(instructions)).toEqual([
      [p("SomeMod/SomeMod.dll"), p("SomeMod/SomeMod.dll")],
      [p("SomeMod/assets.json"), p("SomeMod/assets.json")],
    ]);
  });

  it("does not support two top folders, a folder with no DLL, a BepInEx/ folder, or another game", async () => {
    const two = vortexList(["A/", "A/A.dll", "B/", "B/B.dll"]);
    const noDll = vortexList(["SomeMod/", "SomeMod/notes.txt"]);
    expect((await testPluginFolder(two, "survivallog")).supported).toBe(false);
    expect((await testPluginFolder(noDll, "survivallog")).supported).toBe(false);
    expect((await testPluginFolder(NESTED, "survivallog")).supported).toBe(false);
    expect((await testPluginFolder(FOLDER, "valheim")).supported).toBe(false);
  });
});

describe("loose DLL installer", () => {
  it("installs root DLLs with the other root files into the plugins folder", async () => {
    expect((await testLooseDlls(LOOSE, "survivallog")).supported).toBe(true);
    const { instructions } = await installLooseDlls(LOOSE);
    expect(modTypesOf(instructions)).toEqual(["bepinex-plugin"]);
    expect(copiesOf(instructions)).toEqual([
      ["SomeMod.dll", "SomeMod.dll"],
      ["readme.txt", "readme.txt"],
    ]);
  });

  it("does not support an archive with no root DLL, the pack zip, or another game", async () => {
    expect((await testLooseDlls(FOLDER, "survivallog")).supported).toBe(false);
    expect((await testLooseDlls(PACK, "survivallog")).supported).toBe(false);
    expect((await testLooseDlls(LOOSE, "valheim")).supported).toBe(false);
  });
});

describe("each mod installer", () => {
  const cases: [string, readonly string[], (files: readonly string[]) => Promise<{ instructions: { type: string; value?: unknown; destination?: string }[] }>][] = [
    ["BepInEx layout", TRAPLINE, installBepInExLayout],
    ["BepInEx layout under a top folder", NESTED, installBepInExLayout],
    ["plugin folder", FOLDER, installPluginFolder],
    ["loose DLLs", LOOSE, installLooseDlls],
  ];
  for (const [what, files, install] of cases) {
    it(`gives one mod type and only relative destinations inside it: ${what}`, async () => {
      const { instructions } = await install(files);
      expect(modTypesOf(instructions)).toHaveLength(1);
      for (const i of instructions.filter((i) => i.type === "copy")) {
        expect(path.isAbsolute(i.destination!)).toBe(false);
        expect(i.destination!.startsWith("..")).toBe(false);
      }
    });
  }
});
