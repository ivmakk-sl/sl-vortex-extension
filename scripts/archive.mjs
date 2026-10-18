/**
 * The entries of the release archive, from the file list of dist/: the compiled extension, info.json, and the
 * game art, all at the archive root, where Vortex looks for them.
 *
 * @param {readonly string[]} distFiles paths relative to dist/, with forward slashes
 * @returns {string[]}
 */
export function archiveEntries(distFiles) {
  return distFiles
    .filter((f) => !f.includes("/"))
    .filter((f) => !/\.(map|ts|zip)$/.test(f))
    .sort();
}
