# Backend skill

Use this skill when you need to extend the motion-graphics monorepo with an API layer that stays aligned with the existing gallery, effect metadata, and backend architecture document.

## Goals

- Keep the gallery and effect packages intact while adding a backend app under `apps/api`.
- Use Fastify + TypeScript + Zod as the baseline stack.
- Preserve the existing effect metadata contract from `packages/core/src/effect.schema.ts` and the generated registry in `registry/effects.json`.
- Expose read-only public APIs first, with a clear path to authenticated contributor flows later.
- Model routes around effect discovery, effect detail lookup, version metadata, and health checks.

## Working rules

1. Inspect the project’s existing effect registry before inventing a new schema.
2. Reuse the root monorepo conventions and do not replace the gallery app.
3. Prefer a minimal modular monolith over a large infrastructure setup.
4. Add validation using Zod at HTTP boundaries.
5. Keep public browsing unauthenticated.
6. Avoid AI/cloud dependencies in the initial implementation.
7. Prefer static registry-backed APIs early, then evolve toward a database-backed model only when needed.

## Suggested structure

```text
apps/api/
  src/
    app.ts
    server.ts
    config/
    modules/
      health/
      effects/
    shared/
```

## Route expectations

- `GET /health` or `GET /api/health` should report service status.
- `GET /api/effects` should return the public effect catalog.
- `GET /api/effects/:id` should return a single effect by identifier.
- Return consistent JSON payloads and HTTP error shapes.

## Validation checklist

- TypeScript compiles cleanly.
- Fastify app starts without a database dependency.
- Registry JSON still validates against the shared effect metadata schema.
- API routes remain compatible with the generated effect catalog.

## References

- `docs/BACKEND_ARCHITECTURE.md`
- `packages/core/src/effect.schema.ts`
- `registry/effects.json`
- `README.md`
