import * as path from "node:path";

import type { types } from "vortex-api";

import { GAME_ID } from "./common";

// Mod types that modtype-bepinex registers for each game it manages.
export const MODTYPE_INJECTOR = "bepinex-injector"; // deploys to the game root
export const MODTYPE_ROOT = "bepinex-root"; // deploys to <game>/BepInEx
export const MODTYPE_PLUGIN = "bepinex-plugin"; // deploys to <game>/BepInEx/plugins

const PACK_MOD_NAME = "BepInEx Pack for Survival Log";

const isDir = (entry: string) => entry.endsWith(path.sep);
const segments = (entry: string) => entry.split(path.sep).filter((s) => s.length > 0);
const lower = (entry: string) => entry.toLowerCase();

function result(supported: boolean): types.ISupportedResult {
  return { supported, requiredFiles: [] };
}

/** The pack zip: the doorstop proxy and the BepInEx core at the archive root. */
function isPack(files: readonly string[]): boolean {
  const names = files.map(lower);
  return names.includes("winhttp.dll") && names.some((f) => f.startsWith(path.join("bepinex", "core") + path.sep));
}

export async function testBepInExPack(files: readonly string[], gameId: string): Promise<types.ISupportedResult> {
  return result(gameId === GAME_ID && isPack(files));
}

/**
 * Installs the pack as one extract of its zip gives it: each entry at its own path, the dotfiles included,
 * and no generated BepInEx.cfg (the pack ships none).
 */
export async function installBepInExPack(files: readonly string[]): Promise<types.IInstallResult> {
  const copies: types.IInstruction[] = files
    .filter((f) => !isDir(f))
    .map((f) => ({ type: "copy", source: f, destination: f }));
  return {
    instructions: [
      { type: "setmodtype", value: MODTYPE_INJECTOR },
      { type: "attribute", key: "customFileName", value: PACK_MOD_NAME },
      ...copies,
    ],
  };
}

const fileEntries = (files: readonly string[]) => files.filter((f) => !isDir(f));
const isDll = (entry: string) => lower(entry).endsWith(".dll");

/**
 * How many folders lie above the `BepInEx/` folder of a mod archive: 0 when it is at the root,
 * 1 when it is under one top folder, undefined for an archive with no such folder.
 */
function bepinexDepth(files: readonly string[]): 0 | 1 | undefined {
  const fileSegs = fileEntries(files).map(segments);
  if (fileSegs.some((s) => s.length > 1 && lower(s[0]) === "bepinex")) return 0;
  const tops = new Set(files.map((f) => segments(f)[0]));
  if (tops.size === 1 && fileSegs.some((s) => s.length > 2 && lower(s[1]) === "bepinex")) return 1;
  return undefined;
}

function modInstall(modType: string, copies: [string, string][]): types.IInstallResult {
  return {
    instructions: [
      { type: "setmodtype", value: modType },
      ...copies.map(([source, destination]): types.IInstruction => ({ type: "copy", source, destination })),
    ],
  };
}

export async function testBepInExLayout(files: readonly string[], gameId: string): Promise<types.ISupportedResult> {
  return result(gameId === GAME_ID && !isPack(files) && bepinexDepth(files) !== undefined);
}

/**
 * Each file under `BepInEx/` goes to its path after `BepInEx/`, and a DLL next to that folder goes into the
 * plugins folder. Any other file outside the folder (a readme) is left out.
 */
export async function installBepInExLayout(files: readonly string[]): Promise<types.IInstallResult> {
  const depth = bepinexDepth(files) ?? 0;
  const copies = fileEntries(files)
    .map((f) => [f, segments(f)] as const)
    .flatMap(([f, s]): [string, string][] => {
      if (s.length > depth + 1 && lower(s[depth]) === "bepinex") return [[f, s.slice(depth + 1).join(path.sep)]];
      if (s.length === depth + 1 && isDll(f)) return [[f, path.join("plugins", s[depth])]];
      return [];
    });
  return modInstall(MODTYPE_ROOT, copies);
}

export async function testPluginFolder(files: readonly string[], gameId: string): Promise<types.ISupportedResult> {
  const fileSegs = fileEntries(files).map(segments);
  const tops = new Set(files.map((f) => segments(f)[0]));
  const supported =
    gameId === GAME_ID &&
    bepinexDepth(files) === undefined &&
    tops.size === 1 &&
    fileSegs.every((s) => s.length > 1) &&
    fileSegs.some((s) => isDll(s[s.length - 1]));
  return result(supported);
}

/** The top folder with its files goes into the plugins folder. */
export async function installPluginFolder(files: readonly string[]): Promise<types.IInstallResult> {
  return modInstall(MODTYPE_PLUGIN, fileEntries(files).map((f): [string, string] => [f, f]));
}

export async function testLooseDlls(files: readonly string[], gameId: string): Promise<types.ISupportedResult> {
  const rootDll = fileEntries(files).some((f) => segments(f).length === 1 && isDll(f));
  return result(gameId === GAME_ID && bepinexDepth(files) === undefined && rootDll);
}

/** The root DLLs and each other file of the archive go into the plugins folder at their archive paths. */
export async function installLooseDlls(files: readonly string[]): Promise<types.IInstallResult> {
  return modInstall(MODTYPE_PLUGIN, fileEntries(files).map((f): [string, string] => [f, f]));
}

/** The Unity libraries file of the pack page: only `UnityEngine*.dll` files, all at the archive root. */
function isUnityLibs(files: readonly string[]): boolean {
  const entries = fileEntries(files);
  return entries.length > 0 && entries.every((f) => segments(f).length === 1 && /^unityengine.*\.dll$/.test(lower(f)));
}

export async function testUnityLibs(files: readonly string[], gameId: string): Promise<types.ISupportedResult> {
  return result(gameId === GAME_ID && isUnityLibs(files));
}

const UNITY_LIBS_STEPS = [
  "This file is not a mod: it holds the Unity libraries for BepInEx, and Vortex cannot install it.",
  "To use it by hand:",
  "1. Rename the zip to the name in its file description on Nexus, for example 6000.2.7.zip.",
  "2. Close the game.",
  "3. Put the zip, not extracted, into BepInEx\\unity-libs in the game folder.",
].join("\n");

/** Stops the install: Vortex shows the steps, adds no mod, and keeps the archive in Downloads. */
export async function installUnityLibs(): Promise<types.IInstallResult> {
  return { instructions: [{ type: "error", value: "fatal", source: UNITY_LIBS_STEPS }] };
}

export interface Installer {
  id: string;
  priority: number;
  test: (files: readonly string[], gameId: string) => Promise<types.ISupportedResult>;
  install: (files: readonly string[]) => Promise<types.IInstallResult>;
}

/**
 * The installers of the extension in priority order. The pack installer runs before the installers of
 * modtype-bepinex (10), and the Unity libraries refusal after them, before the loose DLL installer would take
 * that file. The mod installers run after FOMOD (20).
 */
export const INSTALLERS: readonly Installer[] = [
  { id: "survivallog-bepinex-pack", priority: 5, test: testBepInExPack, install: installBepInExPack },
  { id: "survivallog-unity-libs", priority: 15, test: testUnityLibs, install: installUnityLibs },
  { id: "survivallog-bepinex-layout", priority: 21, test: testBepInExLayout, install: installBepInExLayout },
  { id: "survivallog-plugin-folder", priority: 22, test: testPluginFolder, install: installPluginFolder },
  { id: "survivallog-loose-dlls", priority: 23, test: testLooseDlls, install: installLooseDlls },
];
