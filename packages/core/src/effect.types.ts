export type EffectCategory = 'typography' | 'data' | 'number' | 'ui';

export type EffectJsonValue = string | number | boolean | null | EffectJsonValue[] | { [key: string]: EffectJsonValue };

export interface EffectPropertyField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'enum';
  description: string;
  defaultValue?: EffectJsonValue;
  required?: boolean;
  options?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  items?: {
    type: 'string' | 'number' | 'object';
    properties?: Record<string, 'string' | 'number' | 'boolean'>;
    required?: string[];
  };
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
  exportName: string;
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
