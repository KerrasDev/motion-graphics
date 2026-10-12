export type EffectCategory = 'typography' | 'data' | 'number' | 'ui';

export interface EffectPropertyField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'enum';
  description: string;
  defaultValue?: string | number | boolean | string[];
  required?: boolean;
  options?: string[];
}

export interface EffectCompatibility {
  remotion: string;
  react: string;
}

export interface EffectMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  entry: string;
  preview: string;
  framework: 'remotion';
  version: string;
  dependencies: string[];
  license: string;
  properties: EffectPropertyField[];
  compatibility: EffectCompatibility;
  documentationUrl?: string;
}
