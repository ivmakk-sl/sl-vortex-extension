import * as os from "node:os";
import * as path from "node:path";

import { fs, log, selectors, util } from "vortex-api";
import type { types } from "vortex-api";

import { EXECUTABLE, GAME_ASSEMBLY, GAME_ID, GAME_NAME, PACK_MOD_ID, STEAM_APP_ID } from "./common";
import { INSTALLERS } from "./installers";
import { hasBepInExCore, lookupPackFile } from "./pack";
import { openShortcut, SHORTCUTS, type ShellApi, type Shortcut } from "./shortcuts";
import { parseGameVersion, VERSION_FILE } from "./version";

/**
 * The deploy folders of the BepInEx mod types below the game root. Vortex does not create them, and it
 * offers no deployment method while one of them is missing.
 */
const MOD_TYPE_DIRS = [path.join("BepInEx", "plugins"), path.join("BepInEx", "patchers")];

async function ensureModTypeDirs(gamePath: string): Promise<void> {
  for (const dir of MOD_TYPE_DIRS) await fs.ensureDirWritableAsync(path.join(gamePath, dir));
}

/**
 * Vortex tests the deploy folders for write access when it activates the game, before it calls the game
 * setup, and shows "Deployment not possible" for a missing folder. So the folders are also made as soon as
 * Vortex knows the game path: at start, and when detection or the player sets the path.
 */
function ensureModTypeDirsOnDiscovery(api: types.IExtensionApi): void {
  const ensure = (gamePath: string | undefined) => {
    if (gamePath === undefined) return;
    ensureModTypeDirs(gamePath).catch((err) => log("warn", "could not create the BepInEx folders", { gamePath, err }));
  };
  ensure(selectors.discoveryByGame(api.getState(), GAME_ID)?.path);
  api.onStateChange?.(["settings", "gameMode", "discovered", GAME_ID], (prev, cur) => {
    if (cur?.path !== prev?.path) ensure(cur?.path);
  });
}

/**
 * The game version of `Version.txt`, since the version of the executable is the Unity version. A throw makes
 * Vortex log the reason and read the executable.
 */
async function getGameVersion(gamePath: string): Promise<string> {
  const file = path.join(gamePath, VERSION_FILE);
  const version = parseGameVersion(await fs.readFileAsync(file, { encoding: "utf8" }));
  if (version === undefined) throw new Error(`${file} has no version line and build line`);
  return version;
}

/**
 * Gives modtype-bepinex the Nexus file of the pack, or no download when the game folder already has
 * the BepInEx core: the module looks only for a pack mod in Vortex, not for a manual install.
 */
async function packDownload(api: types.IExtensionApi) {
  const gamePath = selectors.discoveryByGame(api.getState(), GAME_ID)?.path;
  if (gamePath !== undefined) {
    const exists = (rel: string) => fs.statAsync(path.join(gamePath, rel)).then(() => true, () => false);
    if (await hasBepInExCore(exists)) {
      log("info", "BepInEx found in the game folder, no pack download", { gamePath });
      return undefined;
    }
  }
  const pack = await lookupPackFile(globalThis.fetch, (reason) => log("warn", "BepInEx pack lookup failed", reason));
  log("info", "BepInEx pack file", pack);
  return {
    domainId: GAME_ID,
    gameId: GAME_ID,
    modId: PACK_MOD_ID,
    fileId: pack.fileId,
    version: pack.version,
    archiveName: pack.archiveName,
    architecture: "x64",
    allowAutoInstall: true,
  };
}

/** Opens a shortcut of the folder menu; the preload shell is read at click time, the compiler has no DOM types. */
async function onShortcut(api: types.IExtensionApi, entry: Shortcut): Promise<void> {
  const gamePath = selectors.discoveryByGame(api.getState(), GAME_ID)?.path ?? "";
  const opener = await openShortcut(entry, entry.target(gamePath, os.homedir()), {
    stat: (target) => fs.statAsync(target),
    shell: (globalThis as { api?: { shell?: ShellApi } }).api?.shell,
    opn: (target) => util.opn(target),
    notify: (message) => api.sendNotification?.({ type: "warning", message, displayMS: 5000 }),
  });
  log("debug", "shortcut", { label: entry.label, opener });
}

function main(context: types.IExtensionContext): boolean {
  context.requireExtension("modtype-bepinex");

  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    logo: "gameart.jpg",
    mergeMods: true,
    requiresCleanup: true,
    // Mods deploy from the game root; each installer sets a BepInEx mod type with its own folder.
    queryModPath: () => ".",
    executable: () => EXECUTABLE,
    requiredFiles: [EXECUTABLE, GAME_ASSEMBLY],
    queryArgs: { steam: [{ id: STEAM_APP_ID }] },
    environment: { SteamAPPId: STEAM_APP_ID },
    // Open Game Mods Folder of Vortex opens the plugins folder; the deploy folders stay as they are.
    details: { steamAppId: Number(STEAM_APP_ID), nexusPageId: GAME_ID, customOpenModsPath: path.join("BepInEx", "plugins") },
    setup: (discovery) => ensureModTypeDirs(discovery.path!),
    getGameVersion,
  });

  for (const { id, priority, test, install } of INSTALLERS) context.registerInstaller(id, priority, test, install);

  // After the folder entries of Vortex (300), so Open Game Mods Folder comes first and the others follow it.
  const SHORTCUT_POSITION = 310;
  const isActive = () => selectors.activeGameId(context.api.getState()) === GAME_ID;
  for (const entry of SHORTCUTS) {
    const onClick = () => {
      onShortcut(context.api, entry).catch((err) => log("warn", "shortcut failed", { label: entry.label, err }));
    };
    context.registerAction("mod-icons", SHORTCUT_POSITION, entry.icon, {}, entry.label, onClick, isActive);
  }

  context.once(() => {
    ensureModTypeDirsOnDiscovery(context.api);
    context.api.ext.bepinexAddGame({
      gameId: GAME_ID,
      autoDownloadBepInEx: true,
      unityBuild: "unityil2cpp",
      architecture: "x64",
      customPackDownloader: () => packDownload(context.api),
    });
  });
  return true;
}

export default main;
