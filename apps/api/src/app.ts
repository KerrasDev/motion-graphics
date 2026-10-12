import { Buffer } from 'node:buffer';
import Fastify from 'fastify';
import Redis from 'ioredis';
import { env } from './config/env';
import { registerHealthRoutes } from './modules/health/health.routes';
import { registerEffectRoutes } from './modules/effects/effects.routes';
import {
  registerGitHubWorkspaceRoutes,
  type GitHubWorkspaceRoutesOptions,
} from './modules/github-workspaces/github-workspaces.routes';
import { RedisWorkspaceSessionStore } from './modules/github-workspaces/session-store';

export async function buildApp(workspaceAuthOptions?: GitHubWorkspaceRoutesOptions) {
  const app = Fastify({
    logger: {
      redact: {
        paths: ['req.url'],
        censor: '[REDACTED]',
      },
    },
    ignoreTrailingSlash: true,
  });

  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    app.log.error({ err: error, req: request }, 'Unhandled API error');
    const statusCode = error.statusCode ?? 500;

    reply.code(statusCode).send({
      error: 'Internal server error',
      statusCode,
    });
  });

  await registerHealthRoutes(app);
  await registerEffectRoutes(app);

  if (workspaceAuthOptions) {
    await registerGitHubWorkspaceRoutes(app, workspaceAuthOptions);
  } else if (env.GITHUB_WORKSPACE_ENABLED) {
    const {
      GITHUB_APP_CLIENT_ID: clientId,
      GITHUB_APP_CLIENT_SECRET: clientSecret,
      GITHUB_APP_CALLBACK_URL: callbackUrl,
      GITHUB_GALLERY_ORIGIN: galleryOrigin,
      GITHUB_SESSION_REDIS_URL: redisUrl,
      GITHUB_SESSION_ENCRYPTION_KEY: encryptionKey,
    } = env;
    if (!clientId || !clientSecret || !callbackUrl || !galleryOrigin || !redisUrl || !encryptionKey) {
      throw new Error('GitHub workspace configuration is incomplete.');
    }

    const redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });
    await redis.connect();
    const sessionStore = new RedisWorkspaceSessionStore(redis, Buffer.from(encryptionKey, 'hex'));
    app.addHook('onClose', async () => {
      await sessionStore.close?.();
    });
    await registerGitHubWorkspaceRoutes(app, {
      enabled: true,
      config: {
        clientId,
        clientSecret,
        callbackUrl,
        galleryOrigin,
        nodeEnv: env.NODE_ENV,
      },
      sessionStore,
    });
  } else {
    await registerGitHubWorkspaceRoutes(app, { enabled: false });
  }

  return app;
}
