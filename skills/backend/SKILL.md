# Backend skill

Use this skill when adding the motion-graphics API layer or extending the backend architecture supported by the existing gallery and effect registry.

## Scope

- Extend the monorepo with `apps/api`.
- Keep frontend and effect-package work stable.
- Use Fastify, TypeScript, and Zod for the initial API foundation.
- Use the canonical effect metadata contract in `packages/core/src/effect.schema.ts`.

## Implementation approach

1. Create a minimal Fastify app with health and effects routes.
2. Validate inputs and registry data with Zod.
3. Load the generated effect catalog from `registry/effects.json`.
4. Add lifecycle hooks and environment configuration.
5. Keep the API read-only and public-first.

## Output expectations

- A working backend app under `apps/api`.
- Minimal route module organization.
- Public endpoints for health and effect discovery.
