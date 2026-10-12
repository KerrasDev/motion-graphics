import { readdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { effectMetadataSchema } from '@motion-graphics/core';
import { resolveEffectPath } from './effect-path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const effectsDir = path.join(rootDir, 'packages', 'effects');

const seen = new Set<string>();

for (const entry of readdirSync(effectsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const effectPath = path.join(effectsDir, entry.name);
  const metadataPath = path.join(effectPath, 'effect.json');
  if (!existsSync(metadataPath)) {
    throw new Error(`Effect ${entry.name} is missing effect.json`);
  }

  const raw = readFileSync(metadataPath, 'utf8');
  const data = JSON.parse(raw);
  const parsed = effectMetadataSchema.parse(data);

  if (seen.has(parsed.id)) {
    throw new Error(`Duplicate effect id: ${parsed.id}`);
  }
  seen.add(parsed.id);

  const relativeEntry = resolveEffectPath(effectPath, parsed.entry);
  const relativePreview = resolveEffectPath(effectPath, parsed.preview);
  if (!existsSync(relativeEntry)) {
    throw new Error(`${parsed.id} declares missing entry: ${parsed.entry}`);
  }
  if (!existsSync(relativePreview)) {
    throw new Error(`${parsed.id} declares missing preview: ${parsed.preview}`);
  }
}

console.log(`Validated ${seen.size} effects.`);
