import type { ReactNode } from 'react';
import { DataChart, KineticTitle, NumberCounter } from '@motion-graphics/effects';

type PropertyValues = Record<string, unknown>;

const effectSourceLoaders = import.meta.glob<string>('../../../../packages/effects/*/index.tsx', {
  query: '?raw',
  import: 'default',
});

const effectExportLoaders = import.meta.glob<string>('../../../../registry/exports/*.tsx', {
  query: '?raw',
  import: 'default',
});

export async function loadEffectSource(effectId: string): Promise<string | null> {
  const sourcePath = `../../../../packages/effects/${effectId}/index.tsx`;
  const loadSource = effectSourceLoaders[sourcePath];
  return loadSource ? loadSource() : null;
}

export async function loadEffectExport(effectId: string): Promise<string | null> {
  const exportPath = `../../../../registry/exports/${effectId}.tsx`;
  const loadExport = effectExportLoaders[exportPath];
  return loadExport ? loadExport() : null;
}

const stringValue = (values: PropertyValues, key: string, fallback: string): string => {
  const value = values[key];
  return typeof value === 'string' ? value : fallback;
};

const numberValue = (values: PropertyValues, key: string, fallback: number): number => {
  const value = values[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const booleanValue = (values: PropertyValues, key: string, fallback: boolean): boolean =>
  typeof values[key] === 'boolean' ? values[key] : fallback;

const chartData = (value: unknown): { label: string; value: number }[] => {
  if (!Array.isArray(value)) {
    return [{ label: 'Q1', value: 10 }];
  }
  const points = value.filter(
    (point): point is { label: string; value: number } =>
      typeof point === 'object' &&
      point !== null &&
      'label' in point &&
      typeof point.label === 'string' &&
      'value' in point &&
      typeof point.value === 'number' &&
      Number.isFinite(point.value),
  );
  return points.length > 0 ? points : [{ label: 'Q1', value: 10 }];
};

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const defaultChartColors = ['#2563eb', '#60a5fa', '#c084fc'];

export const effectPreviewMap: Record<string, (values: PropertyValues) => ReactNode> = {
  'kinetic-title': (values) => (
    <KineticTitle
      text={stringValue(values, 'text', 'Motion Graphics')}
      color={stringValue(values, 'color', '#0f172a')}
      fontSize={numberValue(values, 'fontSize', 88)}
      duration={numberValue(values, 'duration', 2)}
      verticalOffset={numberValue(values, 'verticalOffset', 72)}
      fadeIn={booleanValue(values, 'fadeIn', true)}
    />
  ),
  'number-counter': (values) => (
    <NumberCounter
      start={numberValue(values, 'start', 0)}
      end={numberValue(values, 'end', 1200)}
      duration={numberValue(values, 'duration', 2)}
      precision={numberValue(values, 'precision', 0)}
      prefix={stringValue(values, 'prefix', '$')}
      suffix={stringValue(values, 'suffix', '%')}
    />
  ),
  'data-chart': (values) => (
    <DataChart
      title={stringValue(values, 'title', 'Performance')}
      data={chartData(values.data)}
      colors={stringArray(values.colors).length > 0 ? stringArray(values.colors) : defaultChartColors}
      duration={numberValue(values, 'duration', 2)}
      showLabels={booleanValue(values, 'showLabels', true)}
    />
  ),
};
