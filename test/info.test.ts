import { describe, expect, it } from "vitest";

import pkg from "../package.json";
import { makeInfo } from "../scripts/info.mjs";
import { GAME_ID } from "../src/common";

describe("makeInfo", () => {
  it("gives the Vortex game id as the extension id, so each copy of the extension shares one folder name", () => {
    expect(makeInfo(pkg).id).toBe(GAME_ID);
  });

  it("gives the numeric Nexus game id that Vortex needs for the listing", () => {
    expect(makeInfo(pkg).gameId).toBe(9894);
  });

  it("takes the version from package.json", () => {
    expect(makeInfo(pkg).version).toBe(pkg.version);
  });

  it("gives the name, author, and description", () => {
    const info = makeInfo(pkg);
    expect(info.name).toBe("Game: Survival Log");
    expect(info.author).toBe(pkg.author);
    expect(info.description).toBe(pkg.description);
  });
});
