import * as path from "node:path";

import { FALLBACK_PACK, NEXUS_GAME_ID, PACK_MOD_ID } from "./common";

/** One file of the GraphQL `modFiles` answer, with the fields this extension reads. */
export interface NexusFile {
  fileId: number;
  name: string;
  version: string;
  category: string;
  /** Upload time in Unix seconds. */
  date: number;
}

export interface PackFile {
  fileId: number;
  version: string;
  archiveName: string;
}

const GRAPHQL_URL = "https://api.nexusmods.com/v2/graphql";
const LOOKUP_TIMEOUT_MS = 10_000;
const MOD_FILES_QUERY = `query PackFiles($modId: ID!, $gameId: ID!) {
  modFiles(modId: $modId, gameId: $gameId) { fileId name version category date }
}`;

/**
 * The GraphQL file has no field with the file name. The name is the zip name of the pack release;
 * Vortex shows it in the download list and looks for an archive of that name before it downloads.
 */
function packArchiveName(version: string): string {
  return `BepInExPack_SurvivalLog-${version}.zip`;
}

/**
 * The newest MAIN file of the pack page with "BepInEx" in its name (a tie goes to the higher file id), or
 * undefined for none. The name check keeps out another file of the page, such as the Unity libraries, if it
 * is ever marked MAIN.
 */
export function pickPackFile(files: readonly NexusFile[]): PackFile | undefined {
  const main = files
    .filter((f) => f.category === "MAIN" && /bepinex/i.test(f.name))
    .sort((a, b) => b.date - a.date || b.fileId - a.fileId)[0];
  return main && { fileId: main.fileId, version: main.version, archiveName: packArchiveName(main.version) };
}

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Asks the Nexus API for the file list of the pack page and picks the pack file. When the request fails,
 * times out, or finds no MAIN file, it calls `warn` once and gives the fallback file of this release.
 */
export async function lookupPackFile(
  fetchFn: FetchFn,
  warn: (reason: string) => void,
  timeoutMs = LOOKUP_TIMEOUT_MS,
): Promise<PackFile> {
  let reason: string;
  try {
    const res = await fetchFn(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: MOD_FILES_QUERY, variables: { modId: PACK_MOD_ID, gameId: String(NEXUS_GAME_ID) } }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      reason = `HTTP ${res.status}`;
    } else {
      const body = (await res.json()) as { data?: { modFiles?: NexusFile[] }; errors?: { message: string }[] };
      const picked = body.errors?.length ? undefined : pickPackFile(body.data?.modFiles ?? []);
      if (picked) return picked;
      reason = body.errors?.length ? `GraphQL error: ${body.errors[0].message}` : "no MAIN file on the pack page";
    }
  } catch (err) {
    reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }
  warn(`${reason}, using file ${FALLBACK_PACK.fileId} (${FALLBACK_PACK.version})`);
  return FALLBACK_PACK;
}

/** True when the game folder has the BepInEx core, as after a manual install of the pack. */
export async function hasBepInExCore(fileExists: (relPath: string) => boolean | Promise<boolean>): Promise<boolean> {
  return fileExists(path.join("BepInEx", "core", "BepInEx.Core.dll"));
}
