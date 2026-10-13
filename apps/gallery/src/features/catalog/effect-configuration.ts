import type { EffectMetadata, EffectPropertyField } from '@motion-graphics/core';

export type EffectConfigurationResult =
  { success: true; configuration: Record<string, unknown> } | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getEffectPropertyError(property: EffectPropertyField, value: unknown): string | null {
  if (value === undefined) {
    return property.required ? `${property.label} is required.` : null;
  }

  if (property.type === 'string' || property.type === 'enum') {
    if (typeof value !== 'string') return `${property.label} must be a string.`;
    if (property.required && value === '') return `${property.label} is required.`;
    if (property.minLength !== undefined && value.length < property.minLength) {
      return `${property.label} must contain at least ${property.minLength} characters.`;
    }
    if (property.maxLength !== undefined && value.length > property.maxLength) {
      return `${property.label} must contain no more than ${property.maxLength} characters.`;
    }
    if (property.type === 'enum' && property.options?.length && !property.options.includes(value)) {
      return `${property.label} must be one of the available options.`;
    }
    return null;
  }

  if (property.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `${property.label} must be a finite number.`;
    }
    if (property.minimum !== undefined && value < property.minimum) {
      return `${property.label} must be at least ${property.minimum}.`;
    }
    if (property.maximum !== undefined && value > property.maximum) {
      return `${property.label} must be no more than ${property.maximum}.`;
    }
    return null;
  }

  if (property.type === 'boolean') {
    return typeof value === 'boolean' ? null : `${property.label} must be true or false.`;
  }

  if (!Array.isArray(value)) return `${property.label} must be an array.`;
  if (property.minItems !== undefined && value.length < property.minItems) {
    return `${property.label} must contain at least ${property.minItems} items.`;
  }
  if (property.maxItems !== undefined && value.length > property.maxItems) {
    return `${property.label} must contain no more than ${property.maxItems} items.`;
  }

  if (property.items) {
    for (const [index, item] of value.entries()) {
      const itemLabel = `${property.label}[${index}]`;
      if (property.items.type === 'string' && typeof item !== 'string') {
        return `${itemLabel} must be a string.`;
      }
      if (property.items.type === 'number' && (typeof item !== 'number' || !Number.isFinite(item))) {
        return `${itemLabel} must be a finite number.`;
      }
      if (property.items.type === 'object') {
        if (!isRecord(item)) return `${itemLabel} must be an object.`;
        const itemProperties = property.items.properties ?? {};
        for (const key of Object.keys(item)) {
          if (!Object.hasOwn(itemProperties, key)) return `${itemLabel} contains unsupported property "${key}".`;
          if (typeof item[key] !== itemProperties[key]) {
            return `${itemLabel}.${key} must be a ${itemProperties[key]}.`;
          }
          if (typeof item[key] === 'number' && !Number.isFinite(item[key])) {
            return `${itemLabel}.${key} must be a finite number.`;
          }
        }
        for (const key of property.items.required ?? []) {
          if (!Object.hasOwn(item, key)) return `${itemLabel}.${key} is required.`;
        }
      }
    }
  }

  return null;
}

export function getEffectConfigurationError(effect: EffectMetadata, configuration: unknown): string | null {
  if (!isRecord(configuration)) return 'Configuration must be a JSON object.';

  const supportedProperties = new Set(effect.properties.map((property) => property.name));
  for (const key of Object.keys(configuration)) {
    if (!supportedProperties.has(key)) return `Unsupported property "${key}".`;
  }

  for (const property of effect.properties) {
    const error = getEffectPropertyError(property, configuration[property.name]);
    if (error) return error;
  }
  return null;
}

export function parseEffectConfiguration(effect: EffectMetadata, json: string): EffectConfigurationResult {
  let configuration: unknown;
  try {
    configuration = JSON.parse(json);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON.',
    };
  }

  const error = getEffectConfigurationError(effect, configuration);
  if (error) return { success: false, error };
  if (!isRecord(configuration)) return { success: false, error: 'Configuration must be a JSON object.' };
  return { success: true, configuration };
}
