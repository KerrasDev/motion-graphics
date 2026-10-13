import { describe, expect, it } from 'vitest';
import { catalogApi, getDefaultProperties } from '../apps/gallery/src/features/catalog/catalog.api';
import {
  parseEffectConfiguration,
  type EffectConfigurationResult,
} from '../apps/gallery/src/features/catalog/effect-configuration';

function errorMessage(result: EffectConfigurationResult): string {
  if (result.success) throw new Error('Expected invalid effect configuration.');
  return result.error;
}

describe('effect JSON configuration', () => {
  it('accepts every shipped effect default and restores defaults without sharing mutable values', async () => {
    const effects = await catalogApi.listEffects();

    for (const effect of effects) {
      const defaults = getDefaultProperties(effect);
      expect(parseEffectConfiguration(effect, JSON.stringify(defaults))).toMatchObject({ success: true });
    }

    const chart = await catalogApi.getEffect('data-chart');
    expect(chart).not.toBeNull();
    if (!chart) return;

    const editedDefaults = getDefaultProperties(chart);
    const points = editedDefaults.data;
    if (Array.isArray(points) && typeof points[0] === 'object' && points[0] !== null) {
      points[0].label = 'Edited';
    }
    expect(getDefaultProperties(chart).data).toEqual([{ label: 'Q1', value: 10 }]);
  });

  it('returns a useful error for malformed JSON and does not produce a configuration', async () => {
    const effect = await catalogApi.getEffect('kinetic-title');
    expect(effect).not.toBeNull();
    if (!effect) return;

    expect(errorMessage(parseEffectConfiguration(effect, '{"text":'))).toMatch(/^Invalid JSON:/);
  });

  it('rejects unknown properties and values with the wrong type', async () => {
    const effect = await catalogApi.getEffect('kinetic-title');
    expect(effect).not.toBeNull();
    if (!effect) return;

    expect(
      errorMessage(
        parseEffectConfiguration(
          effect,
          JSON.stringify({
            text: 'Hello',
            unexpected: true,
          }),
        ),
      ),
    ).toContain('Unsupported property "unexpected"');
    expect(
      errorMessage(
        parseEffectConfiguration(
          effect,
          JSON.stringify({
            text: 42,
          }),
        ),
      ),
    ).toContain('Text must be a string');
  });

  it('enforces numeric bounds and nested array item schemas', async () => {
    const title = await catalogApi.getEffect('kinetic-title');
    const chart = await catalogApi.getEffect('data-chart');
    expect(title).not.toBeNull();
    expect(chart).not.toBeNull();
    if (!title || !chart) return;

    expect(
      errorMessage(
        parseEffectConfiguration(
          title,
          JSON.stringify({
            text: 'Hello',
            fontSize: 513,
          }),
        ),
      ),
    ).toContain('Font size must be no more than 512');
    expect(
      errorMessage(
        parseEffectConfiguration(
          chart,
          JSON.stringify({
            data: [{ label: 'Q1', value: 'ten' }],
          }),
        ),
      ),
    ).toContain('Data[0].value must be a number');
  });

  it('rejects missing required values and preserves valid user edits for copying', async () => {
    const effect = await catalogApi.getEffect('kinetic-title');
    expect(effect).not.toBeNull();
    if (!effect) return;

    expect(errorMessage(parseEffectConfiguration(effect, '{}'))).toContain('Text is required');
    const edited = parseEffectConfiguration(effect, JSON.stringify({ text: 'Hello world' }));
    expect(edited).toEqual({
      success: true,
      configuration: { text: 'Hello world' },
    });
  });

  it('accepts empty optional text but rejects empty optional numbers', async () => {
    const effect = await catalogApi.getEffect('number-counter');
    expect(effect).not.toBeNull();
    if (!effect) return;

    expect(parseEffectConfiguration(effect, JSON.stringify({ end: 10, suffix: '' }))).toMatchObject({
      success: true,
    });
    expect(errorMessage(parseEffectConfiguration(effect, JSON.stringify({ end: 10, duration: '' })))).toContain(
      'Duration must be a finite number',
    );
  });
});
