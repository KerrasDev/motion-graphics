import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { effectMetadataSchema } from '@motion-graphics/core';
import { resolveEffectPath } from './effect-path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const effectsDir = path.join(rootDir, 'packages', 'effects');
const registryPath = path.join(rootDir, 'registry', 'effects.json');

const seenIds = new Set<string>();
const effects = readdirSync(effectsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const effectPath = path.join(effectsDir, entry.name);
    const metadataPath = path.join(effectPath, 'effect.json');
    if (!existsSync(metadataPath)) {
      throw new Error(`Missing effect.json in ${entry.name}`);
    }

    const raw = readFileSync(metadataPath, 'utf8');
    const parsed = effectMetadataSchema.parse(JSON.parse(raw));
    if (seenIds.has(parsed.id)) {
      throw new Error(`Duplicate effect id: ${parsed.id}`);
    }
    seenIds.add(parsed.id);

    const entryFile = resolveEffectPath(effectPath, parsed.entry);
    const previewFile = resolveEffectPath(effectPath, parsed.preview);

    if (!existsSync(entryFile)) {
      throw new Error(`${parsed.id} declares an entry file that does not exist: ${parsed.entry}`);
    }
    if (!existsSync(previewFile)) {
      throw new Error(`${parsed.id} declares a preview file that does not exist: ${parsed.preview}`);
    }

    return parsed;
  })
  .sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(registryPath, `${JSON.stringify(effects, null, 2)}
`);
console.log(`Wrote registry with ${effects.length} effects.`);
