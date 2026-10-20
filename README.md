# Survival Log support for Vortex

Lets the [Vortex](https://www.nexusmods.com/vortex) mod manager manage mods for the Steam game [Survival Log](https://store.steampowered.com/app/4164790/Survival_Log/). Vortex finds the game, installs the mod loader BepInEx for you, and puts each mod into `BepInEx\plugins`. You can then turn a mod on, update it, or remove it in Vortex.

- **Finds the game.** Vortex finds a Steam install of Survival Log by itself. You can also set the game folder by hand.
- **Installs BepInEx.** When the game folder has no BepInEx, Vortex downloads the [BepInEx Pack for Survival Log](https://www.nexusmods.com/survivallog/mods/12) from Nexus Mods and installs it as a mod, with no extra step. The files are the same as when you extract the pack zip by hand.
- **Keeps your own BepInEx.** If you already installed BepInEx by hand, Vortex does not download the pack and does not change your BepInEx files. It installs only the mods.
- **Installs mods into the right folder.** A mod zip with a `BepInEx` folder (the layout of the Survival Log mods on Nexus), a zip with only `.dll` files, or a zip with one folder that holds a `.dll` all go into `BepInEx\plugins`. A mod never puts a file outside the `BepInEx` folder.
- **Removes mods cleanly.** When you remove a mod in Vortex, only its files leave the game folder.
- **Opens the game's folders.** The folder menu of the **Mods** page has **Open Game Mods Folder** (`BepInEx\plugins`), **Open Mods Config Folder** (`BepInEx\config`, the settings files of the mods), **Open BepInEx Log** (`BepInEx\LogOutput.log`), **Open Unity Log** (`Player.log`), **Open Saves Folder**, **Open Steam Store Page**, and **Open Wiki**. When a log or a folder does not exist yet, Vortex says so and opens nothing.
- **Knows the game version.** Vortex reads the game version from `SurvivalLog_Data\Version.txt`, for example `1.1.19131`, and its Health Check tells you when a game update arrives. Without this extension, Vortex shows the Unity version of the game executable instead.

**This is unofficial.** Neither Nexus Mods nor the developer of Survival Log makes, supports, or endorses this extension. BepInEx is made by the BepInEx team, who do not endorse it either. If you find a bug in the game, remove your mods and check that the bug still happens before you report it to the developer.

Tested with Vortex 2.9.0 and Survival Log 1.1.19131.

## Install

1. Install [Vortex](https://www.nexusmods.com/vortex) if you do not have it.
2. In Vortex, open **Games**, search for **Survival Log**, and click **Manual add** on its card. Vortex installs this extension. You can also click **Mod manager download** in the Files tab of the [Nexus page](https://www.nexusmods.com/site/mods/2471), or open **Extensions** in Vortex and install it there.
3. Restart Vortex when it asks. If Survival Log is not under your managed games yet, click **Add game** on its card (it shows a Steam badge when Vortex found your Steam install).
4. Wait a moment. Vortex downloads the BepInEx pack, and **BepInEx Pack for Survival Log** shows as Enabled in your mod list.

## Add mods

On a Survival Log mod page on Nexus, click **Mod manager download** in the Files tab, or **Vortex** at the top of the page. Vortex downloads the mod, installs it, and deploys it. For a zip that you downloaded yourself, drop it onto the **Drop File(s)** area of the **Mods** page, or use **Install From File**.

The **Unity libraries** file of the BepInEx pack page (for example `6000.2.7.zip`, only `UnityEngine*.dll` files) is not a mod. Vortex refuses it with the steps to use it by hand: rename it to the name in its file description, close the game, and put the zip, not extracted, into `BepInEx\unity-libs`.

## The first start

Start the game from Vortex (**Play**) or from Steam. The first start with a new BepInEx install takes longer than normal, opens the BepInEx console window, and needs an internet connection: see [The first start](https://github.com/ivmakk-sl/sl-bepinex-pack#the-first-start) of the BepInEx pack. Do not close the console window, because that also closes the game.

## Good to know

- **Turn BepInEx off:** disable **BepInEx Pack for Survival Log** in Vortex. Do not remove it: Vortex installs it again at the next deploy while the game folder has no BepInEx.
- **Two empty folders:** as soon as Vortex finds the game, the extension makes the empty folders `BepInEx\plugins` and `BepInEx\patchers` in the game folder. Without them, Vortex shows "Deployment not possible" when you add the game.
- **"Missing required mod" with your own BepInEx:** if you installed BepInEx by hand, the Health Check of Vortex can say that a mod misses the BepInEx pack, because Vortex does not see your BepInEx as a mod. Your mods still work. Hide the warning, or let Vortex install the pack.
- **Saves:** the extension and Vortex do not touch your save files.
- **"Game updated" after the update to 1.0.2:** With extension 1.0.1, Vortex showed the Unity version `6000.2.7.24586` as the game version. After the update of the extension, Vortex shows the notice "Game updated" once, because the version changes to the real game version. Nothing changed in the game.

## Uninstall

- **Remove all mods and BepInEx:** in Vortex, on the **Mods** page, use **Purge Mods**, then stop managing Survival Log on the **Games** page. Vortex removes each file that it put into the game folder. The files that BepInEx made at its first start stay in the `BepInEx` folder (`cache`, `config`, `interop`, `unity-libs`, and the log files). For a clean game folder, close the game and delete the `BepInEx` folder. These steps do not delete your save files.
- **Remove only the extension:** in Vortex, open **Extensions** and remove **Game: Survival Log**. No purge is needed: your mods stay deployed, and when you install the extension again, Vortex shows the same mod list. Purge first only if you want the mods out of the game folder.

## Build from source

Requirements: Node.js 22 (the repo pins it in `mise.toml`). Nothing else: the build does not need the game or Vortex.

```sh
npm ci
npm test
npm run package
```

`npm run package` writes `dist/sl-vortex-extension-<version>.zip` with `info.json`, `index.js`, the other compiled files, and `gameart.jpg` at the root. `npm run deploy:dev` copies the build into `%APPDATA%\Vortex\plugins\survivallog\` (the folder of a Vortex install from Nexus, which it replaces) for a test in Vortex; restart Vortex to load it.

- `src/common.ts` - the game constants: the Steam app id, the executable, the Nexus game id, and the pack file that Vortex uses when it cannot read the file list of the pack page.
- `src/pack.ts` - the choice of the pack file (the newest main file of the pack page, from the public Nexus API) and the check for a BepInEx install in the game folder.
- `src/installers.ts` - the pack installer, the refusal of the Unity libraries file, the three mod installers, and their table with the priorities.
- `src/shortcuts.ts` - the entries of the folder menu and how one opens.
- `src/version.ts` - the game version from `SurvivalLog_Data\Version.txt`.
- `src/index.ts` - the registration with Vortex and its BepInEx module.
- `scripts/audit-nexus.mjs` - runs the installers over the main files of each Survival Log mod on Nexus and prints the result as a table. It needs a Nexus API key: `npm run build`, then `node --env-file=<path to a .env file with NEXUS_API_KEY=...> scripts/audit-nexus.mjs`.

## Credits and license

The game art comes from the key art of Survival Log, by its developer. BepInEx is made by the [BepInEx team](https://github.com/BepInEx/BepInEx). Vortex is made by Nexus Mods.

Licensed under the GNU General Public License v3.0. Copyright (C) 2026 ivmakk. See `LICENSE`.
