import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { effectMetadataSchema } from '@motion-graphics/core';

const effectsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../packages/effects');

export type EffectMetadata = ReturnType<typeof effectMetadataSchema.parse>;

export async function loadEffects(): Promise<EffectMetadata[]> {
  const entries = await readdir(effectsDirectory, { withFileTypes: true });
  const effectDirectories = entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  const effects = await Promise.all(effectDirectories.map(async (directory) => {
    const metadataPath = resolve(effectsDirectory, directory.name, 'effect.json');
    const raw = await readFile(metadataPath, 'utf8');
    return effectMetadataSchema.parse(JSON.parse(raw));
  }));

  return effects.sort((left, right) => left.id.localeCompare(right.id));
}

export async function findEffectById(id: string) {
  const effects = await loadEffects();
  return effects.find((effect) => effect.id === id) ?? null;
}

export async function getExampleEffect() {
  const effects = await loadEffects();
  return effects[0] ?? null;
}
