# Survival Log support for Vortex

Lets the [Vortex](https://www.nexusmods.com/about/vortex/) mod manager manage mods for the Steam game [Survival Log](https://store.steampowered.com/app/4164790/Survival_Log/). Vortex finds the game, installs the mod loader BepInEx for you, and puts each mod into `BepInEx\plugins`. You can then turn a mod on, update it, or remove it in Vortex.

- **Finds the game.** Vortex finds a Steam install of Survival Log by itself. You can also set the game folder by hand.
- **Installs BepInEx.** When the game folder has no BepInEx, Vortex downloads the [BepInEx Pack for Survival Log](https://www.nexusmods.com/survivallog/mods/12) from Nexus Mods and installs it as a mod, with no extra step. The files are the same as when you extract the pack zip by hand.
- **Keeps your own BepInEx.** If you already installed BepInEx by hand, Vortex does not download the pack and does not change your BepInEx files. It installs only the mods.
- **Installs mods into the right folder.** A mod zip with a `BepInEx` folder (the layout of the Survival Log mods on Nexus), a zip with only `.dll` files, or a zip with one folder that holds a `.dll` all go into `BepInEx\plugins`. A mod never puts a file outside the `BepInEx` folder.
- **Removes mods cleanly.** When you remove a mod in Vortex, only its files leave the game folder.

**This is unofficial.** Neither Nexus Mods nor the developer of Survival Log makes, supports, or endorses this extension. BepInEx is made by the BepInEx team, who do not endorse it either. If you find a bug in the game, remove your mods and check that the bug still happens before you report it to the developer.

Tested with Vortex 2.8.2 and Survival Log 1.1.18902 (Steam build 25984240).

## Install

1. Click **Mod manager download** in the Files tab of the [Nexus page](https://www.nexusmods.com/site/mods/2471). Or in Vortex, open **Extensions**, search for **Survival Log**, and install the extension.
2. Restart Vortex when it asks.
3. Open **Games**, find **Survival Log** (it shows a Steam badge when Vortex found your Steam install), and click **Add game**.
4. Wait a moment. Vortex downloads the BepInEx pack, and **BepInEx Pack for Survival Log** shows as Enabled in your mod list.

## Add mods

The Survival Log mod pages on Nexus have no Mod Manager Download button yet, so download each mod with **Manual download**. Then in Vortex, on the **Mods** page, drop the zip onto the **Drop File(s)** area, or use **Install From File**. Vortex installs and deploys it.

## The first start

Start the game from Vortex (**Play**) or from Steam. The first start with a new BepInEx install takes longer than normal, opens the BepInEx console window, and needs an internet connection: see [The first start](https://github.com/ivmakk-sl/sl-bepinex-pack#the-first-start) of the BepInEx pack. Do not close the console window, because that also closes the game.

## Good to know

- **Turn BepInEx off:** disable **BepInEx Pack for Survival Log** in Vortex. Do not remove it: Vortex installs it again at the next deploy while the game folder has no BepInEx.
- **Two empty folders:** as soon as Vortex finds the game, the extension makes the empty folders `BepInEx\plugins` and `BepInEx\patchers` in the game folder. Without them, Vortex shows "Deployment not possible" when you add the game.
- **"Missing required mod" with your own BepInEx:** if you installed BepInEx by hand, the Health Check of Vortex can say that a mod misses the BepInEx pack, because Vortex does not see your BepInEx as a mod. Your mods still work. Hide the warning, or let Vortex install the pack.
- **Saves:** the extension and Vortex do not touch your save files.

## Uninstall

- **Remove all mods and BepInEx:** in Vortex, on the **Mods** page, use **Purge Mods**, then stop managing Survival Log on the **Games** page. Vortex removes each file that it put into the game folder. The files that BepInEx made at its first start stay in the `BepInEx` folder (`cache`, `config`, `interop`, `unity-libs`, and the log files). For a clean game folder, close the game and delete the `BepInEx` folder. These steps do not delete your save files.
- **Remove only the extension:** in Vortex, open **Extensions** and remove **Game: Survival Log**. Purge first, or your mods stay in the game folder with no manager.

## Build from source

Requirements: Node.js 22 (the repo pins it in `mise.toml`). Nothing else: the build does not need the game or Vortex.

```sh
npm ci
npm test
npm run package
```

`npm run package` writes `dist/sl-vortex-extension-<version>.zip` with `info.json`, `index.js`, the other compiled files, and `gameart.png` at the root. `npm run deploy:dev` copies the build into `%APPDATA%\Vortex\plugins\sl-vortex-extension\` for a test in Vortex; restart Vortex to load it.

- `src/common.ts` - the game constants: the Steam app id, the executable, the Nexus game id, and the pack file that Vortex uses when it cannot read the file list of the pack page.
- `src/pack.ts` - the choice of the pack file (the newest main file of the pack page, from the public Nexus API) and the check for a BepInEx install in the game folder.
- `src/installers.ts` - the pack installer and the three mod installers.
- `src/index.ts` - the registration with Vortex and its BepInEx module.

## Credits and license

The game art comes from the key art of Survival Log, by its developer. BepInEx is made by the [BepInEx team](https://github.com/BepInEx/BepInEx). Vortex is made by Nexus Mods.

Licensed under the GNU General Public License v3.0. Copyright (C) 2026 ivmakk. See `LICENSE`.
