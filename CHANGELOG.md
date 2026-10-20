# Changelog

All notable changes to this extension are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version follows [Semantic Versioning](https://semver.org/).

## [1.0.2] - 2026-10-20

### Added

- The folder menu of the Mods page opens the mods config folder (`BepInEx\config`), the BepInEx log, the Unity log, the saves folder, the Steam store page, and the wiki. A missing log or folder shows a message.
- Vortex reads the game version from `SurvivalLog_Data\Version.txt` (for example `1.1.19131`), so its Health Check tells you about a game update. After the update from 1.0.1, Vortex shows "Game updated" once, because the version it had was the Unity version `6000.2.7.24586`.
- Vortex refuses the Unity libraries file of the BepInEx pack page and shows how to use it by hand. Before, its DLLs went into `BepInEx\plugins`.

### Changed

- Open Game Mods Folder opens `BepInEx\plugins`, not the game folder.
- Tested with Vortex 2.9.0 and Survival Log 1.1.19131.

### Fixed

- A mod archive with a `BepInEx/` folder and a DLL next to it installs that DLL into `BepInEx/plugins/`; before, the DLL was left out.
- The BepInEx pack download takes only a file with "BepInEx" in its name, so another main file of the pack page cannot replace the pack.

## [1.0.1] - 2026-10-18

### Changed

- The extension has a fixed id (`survivallog`), so Vortex keeps it in one folder and loads only one copy.
- The game art is a JPEG, which makes the download smaller.

## [1.0.0] - 2026-10-18

### Added

- Vortex finds a Steam install of Survival Log, and accepts a game folder set by hand.
- When the game folder has no BepInEx, Vortex downloads the newest main file of the BepInEx Pack for Survival Log from Nexus Mods and installs it as a mod, with the files unchanged. A BepInEx install made by hand is kept.
- Mod zips with a `BepInEx` folder, with only `.dll` files, or with one folder that holds a `.dll` go into `BepInEx\plugins`.
- Tested with Vortex 2.8.2 and Survival Log 1.1.18902 (Steam build 25984240).
