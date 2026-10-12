import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  GITHUB_WORKSPACE_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  GITHUB_APP_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_APP_CALLBACK_URL: z.string().url().optional(),
  GITHUB_GALLERY_ORIGIN: z.string().url().optional(),
  GITHUB_SESSION_REDIS_URL: z.string().url().optional(),
  GITHUB_SESSION_ENCRYPTION_KEY: z.string().regex(/^[\da-fA-F]{64}$/).optional(),
}).superRefine((value, context) => {
  if (!value.GITHUB_WORKSPACE_ENABLED) {
    return;
  }

  const required = [
    'GITHUB_APP_CLIENT_ID',
    'GITHUB_APP_CLIENT_SECRET',
    'GITHUB_APP_CALLBACK_URL',
    'GITHUB_GALLERY_ORIGIN',
    'GITHUB_SESSION_REDIS_URL',
    'GITHUB_SESSION_ENCRYPTION_KEY',
  ] as const;

  for (const key of required) {
    if (!value[key]) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: `Required when GITHUB_WORKSPACE_ENABLED=true`,
      });
    }
  }

  if (value.GITHUB_APP_CALLBACK_URL && value.NODE_ENV === 'production'
    && new URL(value.GITHUB_APP_CALLBACK_URL).protocol !== 'https:') {
    context.addIssue({
      code: 'custom',
      path: ['GITHUB_APP_CALLBACK_URL'],
      message: 'The GitHub App callback URL must use HTTPS in production.',
    });
  }

  if (value.GITHUB_GALLERY_ORIGIN) {
    const origin = new URL(value.GITHUB_GALLERY_ORIGIN);
    if (origin.pathname !== '/' || origin.search || origin.hash) {
      context.addIssue({
        code: 'custom',
        path: ['GITHUB_GALLERY_ORIGIN'],
        message: 'GITHUB_GALLERY_ORIGIN must be an origin without a path, query, or fragment.',
      });
    }
    if (value.NODE_ENV === 'production' && origin.protocol !== 'https:') {
      context.addIssue({
        code: 'custom',
        path: ['GITHUB_GALLERY_ORIGIN'],
        message: 'The gallery origin must use HTTPS in production.',
      });
    }
  }

  if (value.GITHUB_SESSION_REDIS_URL && value.NODE_ENV === 'production'
    && !value.GITHUB_SESSION_REDIS_URL.startsWith('rediss://')) {
    context.addIssue({
      code: 'custom',
      path: ['GITHUB_SESSION_REDIS_URL'],
      message: 'The production session store URL must use TLS (rediss://).',
    });
  }
});

export const env = envSchema.parse(process.env);
