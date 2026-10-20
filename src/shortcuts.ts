import * as path from "node:path";

import { STEAM_APP_ID } from "./common";

/** Icon names of the Vortex icon set (2.8.2) that fit a shortcut. `open-ext` is the folder icon of the menu. */
export const SHORTCUT_ICONS = ["open-ext", "settings", "changelog", "bug", "savegame", "open-in-browser", "link"] as const;
export type ShortcutIcon = (typeof SHORTCUT_ICONS)[number];

export interface Shortcut {
  label: string;
  icon: ShortcutIcon;
  kind: "folder" | "file" | "url";
  /** The message for a file or folder that does not exist. */
  missing?: string;
  target: (gamePath: string, home: string) => string;
}

// The extension runs only on Windows, so the targets are Windows paths on each test host too.
const join = path.win32.join;
const gameData = (home: string) => join(home, "AppData", "LocalLow", "LLS", "SLGame");

/** The entries of the folder menu of the Mods page, in menu order, after Open Game Mods Folder of Vortex. */
export const SHORTCUTS: readonly Shortcut[] = [
  {
    label: "Open Mods Config Folder",
    icon: "open-ext",
    kind: "folder",
    missing: "No mods config folder yet. BepInEx makes it at the first game start.",
    target: (game) => join(game, "BepInEx", "config"),
  },
  {
    label: "Open BepInEx Log",
    icon: "open-ext",
    kind: "file",
    missing: "No BepInEx log yet. It comes with the first game start.",
    target: (game) => join(game, "BepInEx", "LogOutput.log"),
  },
  {
    label: "Open Unity Log",
    icon: "open-ext",
    kind: "file",
    missing: "No Unity log yet. It comes with the first game start.",
    target: (_game, home) => join(gameData(home), "Player.log"),
  },
  {
    label: "Open Saves Folder",
    icon: "open-ext",
    kind: "folder",
    missing: "No saves folder yet. The game makes it with the first save.",
    target: (_game, home) => join(gameData(home), "Saves"),
  },
  {
    label: "Open Steam Store Page",
    icon: "open-ext",
    kind: "url",
    target: () => `https://store.steampowered.com/app/${STEAM_APP_ID}/`,
  },
  {
    label: "Open Wiki",
    icon: "open-ext",
    kind: "url",
    target: () => "https://survivallog.grandwiki.com/",
  },
];

/** `window.api.shell` of the Vortex preload API. */
export interface ShellApi {
  openFile: (target: string) => unknown;
  openUrl: (target: string) => unknown;
}

export interface ShortcutDeps {
  stat: (target: string) => PromiseLike<unknown>;
  /** Undefined when Vortex has no preload API. */
  shell?: ShellApi;
  opn: (target: string) => PromiseLike<void>;
  notify: (text: string) => void;
}

/**
 * Opens the target of an entry, and gives the opener that ran. A file or folder that does not exist shows the
 * missing text instead, since the shell opens nothing for it and says nothing.
 */
export async function openShortcut(entry: Shortcut, target: string, deps: ShortcutDeps): Promise<"shell" | "opn" | "none"> {
  if (entry.kind !== "url") {
    const exists = await Promise.resolve(deps.stat(target)).then(() => true, () => false);
    if (!exists) {
      deps.notify(entry.missing ?? target);
      return "none";
    }
  }
  const shellOpen = entry.kind === "url" ? deps.shell?.openUrl : deps.shell?.openFile;
  if (typeof shellOpen === "function") {
    await shellOpen.call(deps.shell, target);
    return "shell";
  }
  await deps.opn(target);
  return "opn";
}
