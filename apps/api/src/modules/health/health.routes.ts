import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/api/health', {
    schema: {
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            service: { type: 'string' },
            environment: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['ok', 'service', 'environment', 'timestamp'],
        },
      },
    },
  }, async () => ({
    ok: true,
    service: 'motion-graphics-api',
    environment: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  }));
}
