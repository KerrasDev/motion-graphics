import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { EffectMetadata } from '@motion-graphics/core';
import effects from '../registry/effects.json';
import { copyTextToClipboard } from '../apps/gallery/src/features/catalog/clipboard';
import { loadEffectExport } from '../apps/gallery/src/registry/effects';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedManifest = JSON.parse(
  readFileSync(path.join(rootDirectory, 'registry/exports/manifest.json'), 'utf8'),
) as Record<
  string,
  {
    format: string;
    exportName: string;
    externalDependencies: string[];
    requiredAssets: string[];
  }
>;

describe('generated standalone effect exports', () => {
  it('preserves every shipped implementation and declares its external dependencies', () => {
    for (const effect of effects as EffectMetadata[]) {
      const exportPath = path.join(rootDirectory, 'registry/exports', `${effect.id}.tsx`);
      const source = readFileSync(exportPath, 'utf8');
      const manifest = generatedManifest[effect.id];

      expect(source).toContain(`Standalone Remotion effect: ${effect.name}`);
      expect(source).toContain(`export interface ${effect.exportName}Props`);
      expect(source).toContain(`export { ${effect.exportName},`);
      expect(source).toContain('from "remotion"');
      expect(manifest).toMatchObject({
        format: 'tsx',
        exportName: effect.exportName,
        externalDependencies: effect.dependencies,
        requiredAssets: [],
      });
      expect(source).not.toMatch(/from ["'](?:\.{1,2}\/|@motion-graphics\/)/);
    }
  });

  it('preserves distinctive logic from each real implementation', () => {
    expect(readFileSync(path.join(rootDirectory, 'registry/exports/kinetic-title.tsx'), 'utf8')).toContain(
      'safeOffset',
    );
    expect(readFileSync(path.join(rootDirectory, 'registry/exports/number-counter.tsx'), 'utf8')).toContain(
      'safePrecision',
    );
    expect(readFileSync(path.join(rootDirectory, 'registry/exports/data-chart.tsx'), 'utf8')).toContain('barHeight');
  });

  it('loads only generated exports for registered effect identifiers', async () => {
    expect(await loadEffectExport('kinetic-title')).toContain('safeOffset');
    expect(await loadEffectExport('missing-effect')).toBeNull();
  });
});

describe('effect clipboard', () => {
  it('copies complete effect content and resolves only after clipboard success', async () => {
    const copied: string[] = [];
    await copyTextToClipboard('standalone effect source', {
      writeText: async (text) => {
        copied.push(text);
      },
    });
    expect(copied).toEqual(['standalone effect source']);
  });

  it('reports clipboard errors and rejects empty effect content', async () => {
    await expect(
      copyTextToClipboard('effect source', {
        writeText: async () => {
          throw new Error('Permission denied');
        },
      }),
    ).rejects.toThrow('Permission denied');
    await expect(
      copyTextToClipboard('  ', {
        writeText: async () => undefined,
      }),
    ).rejects.toThrow('There is no effect content to copy');
    await expect(copyTextToClipboard('effect source', undefined)).rejects.toThrow('Clipboard access is unavailable');
  });
});
