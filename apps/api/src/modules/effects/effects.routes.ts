import type { FastifyInstance } from 'fastify';
import { findEffectById, getExampleEffect, loadEffects } from './effects.service';

export async function registerEffectRoutes(app: FastifyInstance) {
  app.get('/api/effects', async () => loadEffects());

  app.get('/api/effects/example', async (_request, reply) => {
    const example = await getExampleEffect();

    if (!example) {
      await reply.code(404).send({ error: 'No example effect found' });
      return;
    }

    return example;
  });

  app.get<{ Params: { id: string } }>('/api/effects/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const effect = await findEffectById(id);

    if (!effect) {
      await reply.code(404).send({ error: `Effect not found: ${id}` });
      return;
    }

    return effect;
  });
}
