import { describe, expect, it, vi } from "vitest";

import { openShortcut, SHORTCUT_ICONS, SHORTCUTS, type Shortcut, type ShortcutDeps } from "../src/shortcuts";

const GAME = "C:\\Games\\Survival Log";
const HOME = "C:\\Users\\p";

describe("shortcut list", () => {
  it("lists the entries in menu order", () => {
    expect(SHORTCUTS.map((s) => s.label)).toEqual([
      "Open Mods Config Folder",
      "Open BepInEx Log",
      "Open Unity Log",
      "Open Saves Folder",
      "Open Steam Store Page",
      "Open Wiki",
    ]);
  });

  it("resolves each target from the game folder and the home folder", () => {
    expect(SHORTCUTS.map((s) => s.target(GAME, HOME))).toEqual([
      "C:\\Games\\Survival Log\\BepInEx\\config",
      "C:\\Games\\Survival Log\\BepInEx\\LogOutput.log",
      "C:\\Users\\p\\AppData\\LocalLow\\LLS\\SLGame\\Player.log",
      "C:\\Users\\p\\AppData\\LocalLow\\LLS\\SLGame\\Saves",
      "https://store.steampowered.com/app/4164790/",
      "https://survivallog.grandwiki.com/",
    ]);
  });

  it("gives each file and folder entry a missing text and each web entry none", () => {
    for (const s of SHORTCUTS) {
      if (s.kind === "url") expect(s.missing).toBeUndefined();
      else expect(s.missing).toMatch(/\S/);
    }
  });

  it("uses only icon names of the Vortex icon set", () => {
    for (const s of SHORTCUTS) expect(SHORTCUT_ICONS).toContain(s.icon);
    expect(SHORTCUTS.map((s) => s.icon)).toEqual(SHORTCUTS.map(() => "open-ext"));
  });
});

const FOLDER: Shortcut = { label: "F", icon: "open-ext", kind: "folder", missing: "No folder yet.", target: () => "C:\\f" };
const FILE: Shortcut = { label: "L", icon: "open-ext", kind: "file", missing: "No log yet.", target: () => "C:\\f\\x.log" };
const WEB: Shortcut = { label: "W", icon: "open-ext", kind: "url", target: () => "https://example.com/" };

function deps(exists: boolean, withShell = true) {
  const d = {
    stat: vi.fn(() => (exists ? Promise.resolve({}) : Promise.reject(new Error("ENOENT")))),
    shell: withShell ? { openFile: vi.fn(), openUrl: vi.fn() } : undefined,
    opn: vi.fn(() => Promise.resolve()),
    notify: vi.fn(),
  };
  return d satisfies ShortcutDeps;
}

describe("openShortcut", () => {
  it("opens an existing folder or file with the preload shell", async () => {
    for (const entry of [FOLDER, FILE]) {
      const d = deps(true);
      expect(await openShortcut(entry, entry.target("", ""), d)).toBe("shell");
      expect(d.shell!.openFile).toHaveBeenCalledWith(entry.target("", ""));
      expect(d.notify).not.toHaveBeenCalled();
    }
  });

  it("shows the missing text and opens nothing for a missing target", async () => {
    const d = deps(false);
    expect(await openShortcut(FILE, "C:\\f\\x.log", d)).toBe("none");
    expect(d.notify).toHaveBeenCalledWith("No log yet.");
    expect(d.shell!.openFile).not.toHaveBeenCalled();
    expect(d.opn).not.toHaveBeenCalled();
  });

  it("opens a web page with no check", async () => {
    const d = deps(false);
    expect(await openShortcut(WEB, "https://example.com/", d)).toBe("shell");
    expect(d.shell!.openUrl).toHaveBeenCalledWith("https://example.com/");
    expect(d.stat).not.toHaveBeenCalled();
  });

  it("falls back to opn when the preload shell has no method for the target", async () => {
    const d = { ...deps(true), shell: { openUrl: vi.fn() } as unknown as ShortcutDeps["shell"] };
    expect(await openShortcut(FILE, "C:\\f\\x.log", d)).toBe("opn");
    expect(d.opn).toHaveBeenCalledWith("C:\\f\\x.log");
  });

  it("falls back to opn when Vortex has no preload shell", async () => {
    const d = deps(true, false);
    expect(await openShortcut(FILE, "C:\\f\\x.log", d)).toBe("opn");
    expect(await openShortcut(WEB, "https://example.com/", d)).toBe("opn");
    expect(d.opn.mock.calls).toEqual([["C:\\f\\x.log"], ["https://example.com/"]]);
  });
});
