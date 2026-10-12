---
name: frontend
description: "Use when building, changing, or reviewing the Motion Graphics React gallery, frontend APIs, effect catalog, previews, property controls, integration instructions, accessibility, performance, or GitHub Pages deployment."
---

# Motion Graphics Frontend Skill

Use this skill for frontend work in `apps/gallery` and related shared contracts. Follow the attached frontend architecture specification while preserving existing project behavior and conventions.

## Architecture

- Keep the gallery static-first and registry-driven. The generated `registry/effects.json` is the browser catalog; do not scan `packages/effects` at runtime or require a backend for public browsing.
- Use React, TypeScript, Vite, React Router, and Remotion already configured in the workspace. Check existing dependencies before adding any.
- Keep catalog access, presentation, property editing, approved preview loading, and integration generation as separate concerns. Prefer small changes that fit the current source tree over creating the entire proposed directory structure.
- Reuse `packages/core` as the source of truth for effect metadata and property schemas. Do not duplicate or silently change the contract.
- Do not hardcode effect IDs or maintain a second manual catalog. A new valid registry entry should appear automatically.

## Workflow

1. Inspect the current gallery pages/components, `packages/core` contracts, generated registry, effect manifests, workspace scripts, and Vite configuration.
2. Identify the smallest relevant UI and data layers to change; preserve the current routing and styling patterns.
3. Load effect data through a frontend catalog module backed by the generated registry. Search and filters should be client-side, case-insensitive, and safe for absent optional fields.
4. Resolve details by effect ID and explicitly represent unknown IDs, loading, empty, and error states. Do not turn failures into a success-shaped empty catalog.
5. Build property controls only from the canonical schema and use declared defaults and allowed values. Keep user edits local to the page and validate before passing values to a preview.
6. Load only trusted, locally bundled previews through an explicit identifier-to-module mapping. Never execute code or dynamically import paths supplied by registry data. Lazy-load expensive previews and provide a useful fallback when unsupported or failing.
7. Generate installation and usage instructions only from verified package metadata and actual source exports. Do not invent package names, versions, properties, or compatibility claims.
8. Validate the change using focused tests first, then the smallest relevant project checks (for example `pnpm typecheck`, `pnpm test`, or `pnpm build`).

## UI and accessibility

- Prefer semantic HTML, responsive layouts, readable typography, restrained styles, and existing design patterns.
- Use links for navigation and buttons for actions. Label inputs, preserve keyboard operation, provide visible focus states, and keep contrast readable.
- Respect `prefers-reduced-motion`; animation must not be required to understand an effect.
- Do not render every full Remotion preview at once. Prefer thumbnails or lazy/on-demand previews.
- Announce copy and validation outcomes accurately. Show copy success only after the clipboard operation succeeds, and provide a usable failure path.
- Treat manifest text as untrusted. Do not render contributed content as raw HTML without sanitization; never use `eval()` or `Function`.

## Static hosting

- Keep Vite assets and application links base-path aware for GitHub Pages project subpaths.
- Use the repository's established routing strategy consistently. If history routing is used, verify direct links and refresh behavior; hash routing avoids server fallback requirements.
- Keep production browsing independent of Node.js, a database, and the API service.
- Reuse existing CI and workspace validation commands rather than duplicating deployment checks.

## Completion report

Summarize the frontend behavior changed, link the relevant files, and report the validation commands and outcomes. Call out any unsupported preview, metadata limitation, or deployment assumption that remains.
