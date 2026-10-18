/**
 * The info.json object that Vortex reads from the root of the extension archive.
 * `gameId` is the numeric Nexus game id: Vortex lists the extension for that game only when it is set.
 *
 * `id` is the Vortex game id: Vortex names the extension folder after it and loads only one copy for each id.
 *
 * @param {{ version: string, author: string, description: string, config: { gameId: string, gameName: string, nexusGameId: number } }} pkg
 */
export function makeInfo(pkg) {
  return {
    id: pkg.config.gameId,
    name: `Game: ${pkg.config.gameName}`,
    author: pkg.author,
    version: pkg.version,
    description: pkg.description,
    gameId: pkg.config.nexusGameId,
  };
}
