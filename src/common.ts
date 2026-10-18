/** Vortex game id: the Nexus domain name, so a Mod Manager Download from a Survival Log page goes to this game. */
export const GAME_ID = "survivallog";
export const GAME_NAME = "Survival Log";
/** Numeric Nexus game id, also in package.json `config.nexusGameId` for info.json. */
export const NEXUS_GAME_ID = 9894;
export const STEAM_APP_ID = "4164790";
export const EXECUTABLE = "SurvivalLog.exe";
/** Present in each IL2CPP build of the game; with the executable it tells a game folder apart. */
export const GAME_ASSEMBLY = "GameAssembly.dll";

/** The BepInEx pack page: nexusmods.com/survivallog/mods/12. */
export const PACK_MOD_ID = 12;

/** Main file of the pack page at the release of this extension, used when the Nexus file list cannot be read. */
export const FALLBACK_PACK = {
  fileId: 16,
  version: "6.0.0-be.788",
  archiveName: "BepInExPack_SurvivalLog-6.0.0-be.788.zip",
} as const;
