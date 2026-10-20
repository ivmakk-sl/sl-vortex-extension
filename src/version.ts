/** The file of the game folder that holds the game version line and the build line. */
export const VERSION_FILE = "SurvivalLog_Data/Version.txt";

/**
 * The game version from the text of `Version.txt`: its first line (the version, digits with dots) and its
 * second line (the build, digits) joined as `1.1.19131`. Undefined for a text of another form.
 */
export function parseGameVersion(text: string): string | undefined {
  const [version, build] = text.split(/\r?\n/).map((line) => line.trim());
  if (!/^\d+(\.\d+)*$/.test(version ?? "") || !/^\d+$/.test(build ?? "")) return undefined;
  return `${version}.${build}`;
}
