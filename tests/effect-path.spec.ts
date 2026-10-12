import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { resolveEffectPath } from '../scripts/effect-path';

describe('resolveEffectPath', () => {
  const effectDirectory = path.resolve('packages/effects/example');

  it('resolves declared files within the effect directory', () => {
    expect(resolveEffectPath(effectDirectory, './src/index.tsx'))
      .toBe(path.join(effectDirectory, 'src', 'index.tsx'));
  });

  it.each(['../other/index.tsx', './nested/../../outside.tsx', './nested\\..\\outside.tsx', '/outside.tsx'])(
    'rejects an unsafe declared path: %s',
    (declaredPath) => {
      expect(() => resolveEffectPath(effectDirectory, declaredPath)).toThrow();
    },
  );
});
