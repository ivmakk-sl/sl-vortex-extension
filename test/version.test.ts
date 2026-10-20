import { describe, expect, it } from "vitest";

import { parseGameVersion } from "../src/version";

describe("parseGameVersion", () => {
  it("joins the version line and the build line", () => {
    expect(parseGameVersion("1.1\n19131\nstaging_1.1\nRelease\n")).toBe("1.1.19131");
  });

  it("reads CRLF line ends", () => {
    expect(parseGameVersion("1.1\r\n19131\r\nstaging_1.1\r\nRelease\r\n")).toBe("1.1.19131");
  });

  it("gives no version for a text of another form", () => {
    expect(parseGameVersion("")).toBeUndefined();
    expect(parseGameVersion("1.1\n")).toBeUndefined();
    expect(parseGameVersion("1.1\n19131a\n")).toBeUndefined();
    expect(parseGameVersion("staging_1.1\n19131\n")).toBeUndefined();
  });
});
