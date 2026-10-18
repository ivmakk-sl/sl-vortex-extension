# Changelog

All notable changes to this extension are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- The extension has a fixed id (`survivallog`), so Vortex keeps it in one folder and loads only one copy.
- The game art is a JPEG, which makes the download smaller.

## [1.0.0] - 2026-10-18

### Added

- Vortex finds a Steam install of Survival Log, and accepts a game folder set by hand.
- When the game folder has no BepInEx, Vortex downloads the newest main file of the BepInEx Pack for Survival Log from Nexus Mods and installs it as a mod, with the files unchanged. A BepInEx install made by hand is kept.
- Mod zips with a `BepInEx` folder, with only `.dll` files, or with one folder that holds a `.dll` go into `BepInEx\plugins`.
- Tested with Vortex 2.8.2 and Survival Log 1.1.18902 (Steam build 25984240).
