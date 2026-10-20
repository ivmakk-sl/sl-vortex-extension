// Runs the installers of the extension over the main files of each Survival Log mod on Nexus and prints a Markdown
// table: the installer that takes each file, where its files go, and the flags to review.
// Run after `npm run build`: node --env-file=<path to .env> scripts/audit-nexus.mjs
// The .env file gives NEXUS_API_KEY, the personal API key of a Nexus account. The script never prints it.
import { classify, flattenPreview } from "./audit-lib.mjs";

const GRAPHQL_URL = "https://api.nexusmods.com/v2/graphql";
const FILES_URL = (/** @type {number} */ modId) => `https://api.nexusmods.com/v1/games/survivallog/mods/${modId}/files.json`;
const MODS_QUERY = `query Mods($filter: ModsFilter, $count: Int, $offset: Int) {
  mods(filter: $filter, count: $count, offset: $offset) { totalCount nodes { modId name } }
}`;

/**
 * @typedef {{ data: { mods: { totalCount: number, nodes: { modId: number, name: string }[] } } }} ModsResponse
 * @typedef {{ files: { category_name: string, file_name: string, content_preview_link?: string }[] }} FilesResponse
 * @typedef {{ files: { file_path: string }[] }} Preview
 */
const PAGE = 50;
// A row lists this many destinations at most; the pack alone has a few hundred.
const MAX_DESTINATIONS = 6;

const key = process.env.NEXUS_API_KEY;
if (!key) {
  console.error("NEXUS_API_KEY is not set. Run: node --env-file=<path to .env> scripts/audit-nexus.mjs");
  process.exit(1);
}

const { INSTALLERS } = await import(new URL("../dist/installers.js", import.meta.url).href);
const apiHeaders = { apikey: key, "Application-Name": "sl-vortex-extension-audit", "Application-Version": "1.0" };

/** @returns {Promise<{ modId: number, name: string }[]>} */
async function listMods() {
  /** @type {{ modId: number, name: string }[]} */
  const mods = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: MODS_QUERY, variables: { filter: { gameDomainName: [{ value: "survivallog" }] }, count: PAGE, offset } }),
    });
    if (!res.ok) throw new Error(`GraphQL mod list: HTTP ${res.status}`);
    const body = /** @type {ModsResponse & { errors?: unknown }} */ (await res.json());
    if (!body.data?.mods) throw new Error(`GraphQL mod list: ${JSON.stringify(body.errors ?? body)}`);
    const { data } = body;
    mods.push(...data.mods.nodes);
    if (mods.length >= data.mods.totalCount || data.mods.nodes.length === 0) return mods.sort((a, b) => a.modId - b.modId);
  }
}

const cell = (/** @type {string} */ text) => text.replaceAll("|", "\\|");

/** @param {string[]} destinations */
function destinationCell(destinations) {
  const shown = destinations.slice(0, MAX_DESTINATIONS).map((d) => `\`${d}\``);
  if (destinations.length > MAX_DESTINATIONS) shown.push(`(${destinations.length - MAX_DESTINATIONS} more)`);
  return shown.join("<br>");
}

const rows = ["| Mod | Name | File | Installer | Destinations | Flags |", "|---|---|---|---|---|---|"];
const mods = await listMods();
for (const { modId, name } of mods) {
  const res = await fetch(FILES_URL(modId), { headers: apiHeaders });
  if (!res.ok) {
    rows.push(`| ${modId} | ${cell(name)} | | | | files.json HTTP ${res.status} |`);
    continue;
  }
  const mainFiles = (/** @type {FilesResponse} */ (await res.json())).files.filter((f) => f.category_name === "MAIN");
  if (mainFiles.length === 0) rows.push(`| ${modId} | ${cell(name)} | | | | no main file |`);
  for (const file of mainFiles) {
    const preview = file.content_preview_link ? await fetch(file.content_preview_link) : undefined;
    if (preview === undefined || !preview.ok) {
      rows.push(`| ${modId} | ${cell(name)} | ${cell(file.file_name)} | | | no preview |`);
      continue;
    }
    const r = await classify(flattenPreview(/** @type {Preview} */ (await preview.json())), INSTALLERS);
    rows.push(`| ${modId} | ${cell(name)} | ${cell(file.file_name)} | ${r.installer} | ${destinationCell(r.destinations)} | ${r.flags.join(", ")} |`);
  }
}
console.log(rows.join("\n"));
console.log(`\n${mods.length} mods in the GraphQL list.`);
