// src/mc.js - shared handles to the prismarine libraries mineflayer bundles (vec3, registry, block, item, recipe,
// windows), resolved through mineflayer itself so the body, the fake bot and mineflayer all use one copy of each.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** require() that resolves from mineflayer's own folder, e.g. requireMc('prismarine-block')(registry). */
export const requireMc = createRequire(require.resolve('mineflayer'));

/** @type {typeof import('vec3').Vec3} */
export const Vec3 = requireMc('vec3').Vec3;

const registries = new Map();

/** The prismarine registry (minecraft-data plus helpers) for a game version, loaded once per version. */
export function registryFor(version) {
  if (!registries.has(version)) registries.set(version, requireMc('prismarine-registry')(version));
  return registries.get(version);
}
