import * as path from "node:path";

import { fs, log, selectors } from "vortex-api";
import type { types } from "vortex-api";

import { EXECUTABLE, GAME_ASSEMBLY, GAME_ID, GAME_NAME, PACK_MOD_ID, STEAM_APP_ID } from "./common";
import {
  installBepInExLayout,
  installBepInExPack,
  installLooseDlls,
  installPluginFolder,
  testBepInExLayout,
  testBepInExPack,
  testLooseDlls,
  testPluginFolder,
} from "./installers";
import { hasBepInExCore, lookupPackFile } from "./pack";

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

// The pack installer runs before the installers of modtype-bepinex (10); the mod installers run after FOMOD (20).
const PRIORITY = { pack: 5, bepinexLayout: 21, pluginFolder: 22, looseDlls: 23 };

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

function main(context: types.IExtensionContext): boolean {
  context.requireExtension("modtype-bepinex");

  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    logo: "gameart.png",
    mergeMods: true,
    requiresCleanup: true,
    // Mods deploy from the game root; each installer sets a BepInEx mod type with its own folder.
    queryModPath: () => ".",
    executable: () => EXECUTABLE,
    requiredFiles: [EXECUTABLE, GAME_ASSEMBLY],
    queryArgs: { steam: [{ id: STEAM_APP_ID }] },
    environment: { SteamAPPId: STEAM_APP_ID },
    details: { steamAppId: Number(STEAM_APP_ID), nexusPageId: GAME_ID },
    setup: (discovery) => ensureModTypeDirs(discovery.path!),
  });

  context.registerInstaller("survivallog-bepinex-pack", PRIORITY.pack, testBepInExPack, installBepInExPack);
  context.registerInstaller("survivallog-bepinex-layout", PRIORITY.bepinexLayout, testBepInExLayout, installBepInExLayout);
  context.registerInstaller("survivallog-plugin-folder", PRIORITY.pluginFolder, testPluginFolder, installPluginFolder);
  context.registerInstaller("survivallog-loose-dlls", PRIORITY.looseDlls, testLooseDlls, installLooseDlls);

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
