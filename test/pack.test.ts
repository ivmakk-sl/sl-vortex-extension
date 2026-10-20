import { describe, expect, it, vi } from "vitest";

import { FALLBACK_PACK } from "../src/common";
import { hasBepInExCore, lookupPackFile, pickPackFile, type NexusFile } from "../src/pack";

// The modFiles answer of nexusmods.com/survivallog/mods/12 on 2026-10-18.
const LIVE_FILES: NexusFile[] = [
  { fileId: 16, name: "BepInExPack SurvivalLog 6.0.0 Be.788", version: "6.0.0-be.788", category: "MAIN", date: 1789921481 },
  { fileId: 69, name: "UnityLibs SurvivalLog 6000.2.7", version: "6000.2.7", category: "ARCHIVED", date: 1792236915 },
  { fileId: 70, name: "Unity libraries 6000.2.7", version: "6000.2.7", category: "OPTIONAL", date: 1792237684 },
];

describe("pickPackFile", () => {
  it("picks the main file of the live list", () => {
    expect(pickPackFile(LIVE_FILES)).toEqual({
      fileId: 16,
      version: "6.0.0-be.788",
      archiveName: "BepInExPack_SurvivalLog-6.0.0-be.788.zip",
    });
  });

  it("picks the newest main file", () => {
    const newer = { fileId: 80, name: "BepInEx Pack 6.0.0-be.800", version: "6.0.0-be.800", category: "MAIN", date: 1795000000 };
    expect(pickPackFile([...LIVE_FILES, newer])?.fileId).toBe(80);
  });

  it("never picks a main file without BepInEx in its name, such as the Unity libraries", () => {
    const libs = { ...LIVE_FILES[2], category: "MAIN" };
    expect(pickPackFile([...LIVE_FILES, libs])?.fileId).toBe(16);
  });

  it("breaks a tie of dates by the higher file id", () => {
    const twin = { ...LIVE_FILES[0], fileId: 17 };
    expect(pickPackFile([twin, LIVE_FILES[0]])?.fileId).toBe(17);
  });

  it("never picks an archived or optional file", () => {
    expect(pickPackFile(LIVE_FILES.slice(1))).toBeUndefined();
  });

  it("gives undefined for an empty list", () => {
    expect(pickPackFile([])).toBeUndefined();
  });
});

function answer(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("lookupPackFile", () => {
  it("posts the modFiles query of the pack page and gives the picked file", async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => answer({ data: { modFiles: LIVE_FILES } }));
    const warn = vi.fn();
    expect(await lookupPackFile(fetchFn, warn)).toEqual(pickPackFile(LIVE_FILES));
    expect(warn).not.toHaveBeenCalled();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.nexusmods.com/v2/graphql");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body)).variables).toEqual({ modId: 12, gameId: "9894" });
  });

  const failures: [string, (url: string, init?: RequestInit) => Promise<Response>][] = [
    ["an HTTP error", async () => answer({ message: "down" }, 503)],
    ["a network error", async () => { throw new TypeError("fetch failed"); }],
    ["a GraphQL error", async () => answer({ errors: [{ message: "bad query" }] })],
    ["a list with no main file", async () => answer({ data: { modFiles: LIVE_FILES.slice(1) } })],
  ];
  for (const [what, fetchFn] of failures) {
    it(`gives the fallback file and one warning for ${what}`, async () => {
      const warn = vi.fn();
      expect(await lookupPackFile(fetchFn, warn)).toEqual(FALLBACK_PACK);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  }

  it("gives the fallback file and one warning when the answer takes longer than the timeout", async () => {
    const hang = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      });
    const warn = vi.fn();
    expect(await lookupPackFile(hang, warn, 20)).toEqual(FALLBACK_PACK);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("hasBepInExCore", () => {
  const folder = (files: string[]) => (rel: string) => files.includes(rel.replace(/\\/g, "/"));

  it("is true when BepInEx/core/BepInEx.Core.dll exists", async () => {
    expect(await hasBepInExCore(folder(["BepInEx/core/BepInEx.Core.dll"]))).toBe(true);
  });

  it("is false for an empty game folder", async () => {
    expect(await hasBepInExCore(folder([]))).toBe(false);
  });

  it("is false for a folder with only BepInEx/plugins/", async () => {
    expect(await hasBepInExCore(folder(["BepInEx/plugins/Trapline.dll"]))).toBe(false);
  });
});
