import type { EffectMetadata } from '@motion-graphics/core';
import registryData from '../../../../../registry/effects.json';

const effects = registryData as EffectMetadata[];

export interface EffectQuery {
  q?: string;
  category?: string;
  tags?: string[];
  sort?: 'name' | 'category';
}

export function getDefaultProperties(effect: EffectMetadata): Record<string, unknown> {
  return Object.fromEntries(
    effect.properties
      .filter((property) => property.defaultValue !== undefined)
      .map((property) => [property.name, property.defaultValue]),
  );
}

export const catalogApi = {
  async listEffects(query: EffectQuery = {}): Promise<EffectMetadata[]> {
    const term = query.q?.trim().toLowerCase();
    const selectedTags = query.tags ?? [];

    const matches = effects.filter((effect) => {
      const matchesTerm = !term || [
        effect.name,
        effect.description,
        effect.category,
        ...effect.tags,
      ].some((value) => value.toLowerCase().includes(term));
      const matchesCategory = !query.category || query.category === 'all' || effect.category === query.category;
      const matchesTags = selectedTags.every((tag) => effect.tags.includes(tag));

      return matchesTerm && matchesCategory && matchesTags;
    });

    if (query.sort === 'name') {
      return [...matches].sort((left, right) => left.name.localeCompare(right.name));
    }
    if (query.sort === 'category') {
      return [...matches].sort((left, right) =>
        left.category.localeCompare(right.category) || left.name.localeCompare(right.name),
      );
    }
    return matches;
  },

  async getEffect(id: string): Promise<EffectMetadata | null> {
    return effects.find((effect) => effect.id === id) ?? null;
  },

  async listCategories(): Promise<string[]> {
    return [...new Set(effects.map((effect) => effect.category))].sort((left, right) => left.localeCompare(right));
  },

  async listTags(): Promise<string[]> {
    return [...new Set(effects.flatMap((effect) => effect.tags))].sort((left, right) => left.localeCompare(right));
  },
};
