import { z } from 'zod';

const propertySchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'enum']),
  description: z.string().min(1),
  defaultValue: z.any().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

export const effectMetadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
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
