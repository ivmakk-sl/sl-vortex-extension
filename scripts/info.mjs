/**
 * The info.json object that Vortex reads from the root of the extension archive.
 * `gameId` is the numeric Nexus game id: Vortex lists the extension for that game only when it is set.
 *
 * @param {{ version: string, author: string, description: string, config: { gameName: string, nexusGameId: number } }} pkg
 */
export function makeInfo(pkg) {
  return {
    name: `Game: ${pkg.config.gameName}`,
    author: pkg.author,
    version: pkg.version,
    description: pkg.description,
    gameId: pkg.config.nexusGameId,
  };
}
