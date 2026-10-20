import * as path from "node:path";
import { describe, expect, it } from "vitest";

import { classify, flattenPreview } from "../scripts/audit-lib.mjs";
import { INSTALLERS } from "../src/installers";
import { PACK_ENTRIES } from "./fixtures/packEntries";
import itemTotalsPreview from "./fixtures/preview-itemtotals.json";
import packPreview from "./fixtures/preview-pack-file16.json";
import { UNITY_LIBS_ENTRIES } from "./fixtures/unityLibsEntries";

const vortexList = (entries: readonly string[]) => entries.map((e) => e.split("/").join(path.sep));
const p = (entry: string) => entry.split("/").join(path.sep);

describe("flattenPreview", () => {
  it("gives the Vortex form of the file list: OS separator and an entry for each folder", () => {
    expect(flattenPreview(itemTotalsPreview)).toEqual(vortexList(["BepInEx/", "BepInEx/plugins/", "BepInEx/plugins/ItemTotals.dll"]));
  });

  it("gives the entry list of the pack zip for the pack file, less its empty folders", () => {
    // A preview lists only files, so the two empty folders of the pack zip are not in it.
    const empty = vortexList(["BepInEx/patchers/", "BepInEx/plugins/"]);
    const expected = vortexList(PACK_ENTRIES).filter((e) => !empty.includes(e));
    expect([...flattenPreview(packPreview)].sort()).toEqual(expected.sort());
  });
});

describe("classify", () => {
  it("gives a published mod zip to the BepInEx layout installer", async () => {
    const r = await classify(vortexList(["BepInEx/", "BepInEx/plugins/", "BepInEx/plugins/Trapline.dll"]), INSTALLERS);
    expect(r).toEqual({ installer: "survivallog-bepinex-layout", destinations: [p("BepInEx/plugins/Trapline.dll")], flags: [] });
  });

  it("gives a bare DLL and a plugin folder to the plugins folder", async () => {
    expect(await classify(["SomeMod.dll"], INSTALLERS)).toEqual({
      installer: "survivallog-loose-dlls",
      destinations: [p("BepInEx/plugins/SomeMod.dll")],
      flags: [],
    });
    expect(await classify(vortexList(["SomeMod/", "SomeMod/SomeMod.dll"]), INSTALLERS)).toEqual({
      installer: "survivallog-plugin-folder",
      destinations: [p("BepInEx/plugins/SomeMod/SomeMod.dll")],
      flags: [],
    });
  });

  it("flags an archive that an installer of modtype-bepinex takes first", async () => {
    const r = await classify(vortexList(["plugins/", "plugins/Foo.dll"]), INSTALLERS);
    expect(r).toEqual({ installer: "modtype-bepinex", destinations: [p("BepInEx/plugins/Foo.dll")], flags: ["modtype-bepinex"] });
  });

  it("flags the pack, the Unity libraries file, a FOMOD, and an archive that no installer takes", async () => {
    expect(await classify(vortexList(PACK_ENTRIES), INSTALLERS)).toMatchObject({ installer: "survivallog-bepinex-pack", flags: ["pack"] });
    expect(await classify(vortexList(UNITY_LIBS_ENTRIES), INSTALLERS)).toEqual({
      installer: "survivallog-unity-libs",
      destinations: [],
      flags: ["refused"],
    });
    expect(await classify(vortexList(["fomod/", "fomod/ModuleConfig.xml", "Foo.dll"]), INSTALLERS)).toEqual({
      installer: "fomod",
      destinations: [],
      flags: ["fomod"],
    });
    expect(await classify(["readme.txt"], INSTALLERS)).toEqual({ installer: "none", destinations: [], flags: ["no installer"] });
  });

  it("flags a destination outside the BepInEx folder", async () => {
    const rogue = {
      id: "rogue",
      priority: 1,
      test: async () => ({ supported: true, requiredFiles: [] }),
      install: async () => ({
        instructions: [
          { type: "setmodtype", value: "bepinex-injector" },
          { type: "copy", source: "a.dll", destination: "a.dll" },
        ],
      }),
    };
    expect(await classify(["a.dll"], [rogue])).toEqual({ installer: "rogue", destinations: ["a.dll"], flags: ["outside BepInEx"] });
  });
});
