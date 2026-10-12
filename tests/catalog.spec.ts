import { describe, expect, it } from 'vitest';
import { catalogApi, getDefaultProperties } from '../apps/gallery/src/features/catalog/catalog.api';

describe('gallery catalog API', () => {
  it('searches names, descriptions, categories, and tags without case sensitivity', async () => {
    const effects = await catalogApi.listEffects({ q: 'ANALYTICS' });

    expect(effects.map((effect) => effect.id)).toContain('data-chart');
  });

  it('filters by category and all selected tags', async () => {
    const effects = await catalogApi.listEffects({
      category: 'number',
      tags: ['counter', 'metrics'],
    });

    expect(effects.map((effect) => effect.id)).toEqual(['number-counter']);
  });

  it('sorts results without mutating the source registry', async () => {
    const original = await catalogApi.listEffects();
    const alphabetical = await catalogApi.listEffects({ sort: 'name' });
    const byCategory = await catalogApi.listEffects({ sort: 'category' });

    expect(alphabetical.map((effect) => effect.name)).toEqual([...alphabetical.map((effect) => effect.name)].sort());
    expect(byCategory).toHaveLength(alphabetical.length);
    expect(await catalogApi.listEffects()).toEqual(original);
  });

  it('returns null for unknown effect identifiers and exposes declared defaults', async () => {
    expect(await catalogApi.getEffect('missing-effect')).toBeNull();
    const chart = await catalogApi.getEffect('data-chart');

    expect(chart).not.toBeNull();
    if (chart) {
      expect(getDefaultProperties(chart)).toMatchObject({
        title: 'Performance',
        duration: 2,
        data: [{ label: 'Q1', value: 10 }],
      });
    }
  });
});
