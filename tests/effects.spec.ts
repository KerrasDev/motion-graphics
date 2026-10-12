import { describe, expect, it } from 'vitest';
import { effectMetadataSchema } from '@motion-graphics/core';
import kinetic from '../packages/effects/kinetic-title/effect.json';
import counter from '../packages/effects/number-counter/effect.json';
import chart from '../packages/effects/data-chart/effect.json';

describe('effect metadata', () => {
  it('accepts all shipped effect definitions', () => {
    expect(effectMetadataSchema.parse(kinetic)).toMatchObject({ id: 'kinetic-title' });
    expect(effectMetadataSchema.parse(counter)).toMatchObject({ id: 'number-counter' });
    expect(effectMetadataSchema.parse(chart)).toMatchObject({ id: 'data-chart' });
  });
});
