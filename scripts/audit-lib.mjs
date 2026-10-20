import * as path from "node:path";

/**
 * @typedef {{ type: string, source?: string, destination?: string, value?: unknown }} Instruction
 * @typedef {{
 *   id: string,
 *   priority: number,
 *   test: (files: readonly string[], gameId: string) => PromiseLike<{ supported: boolean }>,
 *   install: (files: readonly string[]) => PromiseLike<{ instructions: Instruction[] }>,
 * }} Installer
 * @typedef {{ installer: string, destinations: string[], flags: string[] }} Classification
 */

const GAME_ID = "survivallog";

/**
 * The file list that Vortex builds for an archive, from its Nexus file preview (`content_preview_link`): each
 * file with the OS separator, and before its files an entry for each folder, which ends with the separator.
 *
 * @param {{ files: readonly { file_path: string }[] }} preview
 * @returns {string[]}
 */
export function flattenPreview(preview) {
  /** @type {Set<string>} */
  const entries = new Set();
  for (const { file_path } of preview.files) {
    const segs = file_path.split("/").filter((s) => s.length > 0);
    for (let i = 1; i < segs.length; i++) entries.add(segs.slice(0, i).join(path.sep) + path.sep);
    entries.add(segs.join(path.sep));
  }
  return [...entries];
}

/** The deploy folder of each mod type below the game folder; a mod with no mod type deploys to the game root. */
const MODTYPE_DIRS = /** @type {Record<string, string>} */ ({
  "bepinex-injector": "",
  "bepinex-root": "BepInEx",
  "bepinex-plugin": path.join("BepInEx", "plugins"),
});

const isDir = (/** @type {string} */ entry) => entry.endsWith(path.sep);
const fileEntries = (/** @type {readonly string[]} */ files) => files.filter((f) => !isDir(f));

// The two installers of modtype-bepinex at priority 10, by their tests in Vortex 2.9.0 (bundledPlugins/modtype-bepinex):
// a first folder `plugins`, `config`, or `patchers` (exact case), or more than 8 known BepInEx core file names.
const ROOT_DIRS = ["plugins", "config", "patchers"];
const INJECTOR_FILES = [
  "0Harmony.dll", "0Harmony.xml", "0Harmony20.dll", "BepInEx.dll", "BepInEx.Core.dll", "BepInEx.Preloader.Core.dll",
  "BepInEx.Preloader.Unity.dll", "BepInEx.Harmony.dll", "BepInEx.Harmony.xml", "BepInEx.Preloader.dll",
  "BepInEx.Preloader.xml", "BepInEx.xml", "HarmonyXInterop.dll", "Mono.Cecil.dll", "Mono.Cecil.Mdb.dll",
  "Mono.Cecil.Pdb.dll", "Mono.Cecil.Rocks.dll", "MonoMod.RuntimeDetour.dll", "MonoMod.RuntimeDetour.xml",
  "MonoMod.Utils.dll", "MonoMod.Utils.xml",
].map((f) => f.toLowerCase());

/** @type {Installer} */
const MODTYPE_BEPINEX = {
  id: "modtype-bepinex",
  priority: 10,
  test: async (files) => {
    const injector = files.filter((f) => INJECTOR_FILES.includes(path.basename(f).toLowerCase())).length > 8;
    const root = files.some((f) => ROOT_DIRS.includes(f.split(path.sep)[0]));
    return { supported: injector || root };
  },
  install: async (files) => {
    const root = files.some((f) => ROOT_DIRS.includes(f.split(path.sep)[0]));
    return {
      instructions: [
        { type: "setmodtype", value: root ? "bepinex-root" : "bepinex-injector" },
        ...fileEntries(files).map((f) => ({ type: "copy", source: f, destination: f })),
      ],
    };
  },
};

/**
 * The FOMOD installer of Vortex at priority 20: an archive with `fomod/ModuleConfig.xml`.
 *
 * @type {Installer}
 */
const FOMOD = {
  id: "fomod",
  priority: 20,
  test: async (files) => ({
    supported: files.some((f) => f.toLowerCase().endsWith(path.join("fomod", "moduleconfig.xml"))),
  }),
  install: async () => ({ instructions: [] }),
};

/**
 * What Vortex does with an archive of the file list `files` (the Vortex form: OS separator, a trailing separator
 * for a folder): the first supporting installer by priority among `installers` and the Vortex installers that
 * run between them, the game paths of the files it deploys, and the flags for a review.
 *
 * @param {readonly string[]} files
 * @param {readonly Installer[]} installers
 * @returns {Promise<Classification>}
 */
export async function classify(files, installers) {
  const all = [...installers, MODTYPE_BEPINEX, FOMOD].sort((a, b) => a.priority - b.priority);
  for (const installer of all) {
    if (!(await installer.test(files, GAME_ID)).supported) continue;
    if (installer === FOMOD) return { installer: "fomod", destinations: [], flags: ["fomod"] };
    const { instructions } = await installer.install(files);
    if (instructions.some((i) => i.type === "error" && i.value === "fatal")) {
      return { installer: installer.id, destinations: [], flags: ["refused"] };
    }
    const modType = /** @type {string | undefined} */ (instructions.find((i) => i.type === "setmodtype")?.value);
    const base = MODTYPE_DIRS[modType ?? ""] ?? "";
    const destinations = instructions
      .filter((i) => i.type === "copy" && i.destination !== undefined)
      .map((i) => path.join(base, /** @type {string} */ (i.destination)));
    const flags = [];
    if (installer === MODTYPE_BEPINEX) flags.push("modtype-bepinex");
    if (installer.id === "survivallog-bepinex-pack") flags.push("pack");
    else if (destinations.some((d) => !d.toLowerCase().startsWith("bepinex" + path.sep) || d.split(path.sep).includes(".."))) {
      flags.push("outside BepInEx");
    }
    return { installer: installer.id, destinations, flags };
  }
  return { installer: "none", destinations: [], flags: ["no installer"] };
}
