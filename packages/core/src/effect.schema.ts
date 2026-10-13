import { z } from 'zod';

const propertySchema = z.object({
  name: z.string().regex(/^[A-Za-z_$][\w$]*$/),
  label: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'enum']),
  description: z.string().min(1),
  defaultValue: z.any().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  minimum: z.number().finite().optional(),
  maximum: z.number().finite().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().nonnegative().optional(),
  items: z.object({
    type: z.enum(['string', 'number', 'object']),
    properties: z.record(z.string(), z.enum(['string', 'number', 'boolean'])).optional(),
    required: z.array(z.string()).optional(),
  }).optional(),
}).superRefine((field, context) => {
  if (field.minimum !== undefined && field.maximum !== undefined && field.minimum > field.maximum) {
    context.addIssue({ code: 'custom', message: 'minimum must not exceed maximum', path: ['minimum'] });
  }
  if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) {
    context.addIssue({ code: 'custom', message: 'minLength must not exceed maxLength', path: ['minLength'] });
  }
  if (field.minItems !== undefined && field.maxItems !== undefined && field.minItems > field.maxItems) {
    context.addIssue({ code: 'custom', message: 'minItems must not exceed maxItems', path: ['minItems'] });
  }
  if (field.type !== 'array' && (field.items || field.minItems !== undefined || field.maxItems !== undefined)) {
    context.addIssue({ code: 'custom', message: 'Array item constraints require type=array.', path: ['items'] });
  }
  if (field.items?.type !== 'object' && (field.items?.properties || field.items?.required)) {
    context.addIssue({ code: 'custom', message: 'Item properties require object array items.', path: ['items'] });
  }
  for (const requiredName of field.items?.required ?? []) {
    if (!Object.hasOwn(field.items?.properties ?? {}, requiredName)) {
      context.addIssue({
        code: 'custom',
        message: `Required item property "${requiredName}" must be declared.`,
        path: ['items', 'required'],
      });
    }
  }
});

export const effectMetadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  exportName: z.string().regex(/^[A-Z][A-Za-z0-9]*$/),
  entry: z.string().startsWith('./'),
  preview: z.string().startsWith('./'),
  framework: z.literal('remotion'),
  version: z.string().min(1),
  dependencies: z.array(z.string()),
  license: z.string().min(1),
  properties: z.array(propertySchema).default([]),
  compatibility: z.object({
    remotion: z.string().min(1),
    react: z.string().min(1),
  }),
  documentationUrl: z.string().url().optional(),
});
