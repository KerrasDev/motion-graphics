import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { effectMetadataSchema, type EffectMetadata } from '@motion-graphics/core';
import { resolveEffectPath } from './effect-path';
import { buildEffectExport, type EffectExportManifestEntry } from './build-effect-exports';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const effectsDir = path.join(rootDir, 'packages', 'effects');
const registryPath = path.join(rootDir, 'registry', 'effects.json');
const exportsDir = path.join(rootDir, 'registry', 'exports');

async function main(): Promise<void> {
  const seenIds = new Set<string>();
  const effectDirectories = readdirSync(effectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  const effects: EffectMetadata[] = [];
  const exportManifest: Record<string, EffectExportManifestEntry> = {};

  mkdirSync(exportsDir, { recursive: true });
  for (const entry of effectDirectories) {
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

    const generatedExport = await buildEffectExport(parsed, entryFile);
    writeFileSync(path.join(exportsDir, `${parsed.id}.tsx`), generatedExport.source);
    exportManifest[parsed.id] = generatedExport.manifest;
    effects.push(parsed);
  }

  writeFileSync(registryPath, `${JSON.stringify(effects, null, 2)}\n`);
  writeFileSync(path.join(exportsDir, 'manifest.json'), `${JSON.stringify(exportManifest, null, 2)}\n`);
  console.log(`Wrote registry and standalone exports for ${effects.length} effects.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
