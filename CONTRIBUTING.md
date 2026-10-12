# Contributing

Thanks for helping improve Motion Graphics.

## Workflow

1. Fork the repository.
2. Create a feature branch.
3. Add a new effect directory under `packages/effects/<effect-id>/`.
4. Include `index.tsx`, `preview.tsx`, `effect.json`, and `README.md`.
5. Run:
   - `pnpm install`
   - `pnpm validate:effects`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm build`
6. Commit your change and open a pull request.

## Creating a new effect

Each effect must contain:

- a unique `id`
- valid metadata in `effect.json`
- component code in `index.tsx`
- a lightweight preview in `preview.tsx`
- documentation in `README.md`

The registry is generated automatically via `pnpm registry:build`.

## Pull request template

Please include:

- Effect name and ID
- Category and tags
- Preview or screenshot
- Supported properties
- Dependencies
- License and asset provenance
- Compatibility notes
- Validation results

## Local validation

```bash
pnpm install
pnpm check
```
