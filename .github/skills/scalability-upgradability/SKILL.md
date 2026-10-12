---
name: scalability-upgradability
description: "Use when auditing or improving Motion Graphics repository scalability, upgradability, architecture, pnpm workspaces, dependency ownership, node_modules layout, build efficiency, or GitHub Pages readiness."
---

# Scalability and Upgradability

Use this skill to safely audit and incrementally improve the existing Motion Graphics monorepo. Treat this as an existing-project maintenance workflow, not a greenfield rewrite.

## Principles

- Inspect the current repository state before changing files. Do not assume prior installs, builds, or implementation attempts completed.
- Preserve user changes and working behavior. Never reset, clean, or broadly overwrite the repository.
- Prefer the smallest evidence-based change. Do not introduce enterprise-scale infrastructure or reorganize files for appearance alone.
- Keep the project reproducible with pnpm, the declared Node/pnpm versions, workspace manifests, and lockfile.
- Distinguish confirmed source/build defects from network, registry, cache, or package-install failures.
- Do not delete `node_modules`, generated output, lockfiles, or user data unless the exact target is proven stale or redundant and deletion is explicitly within scope.

## Audit workflow

1. Inspect the project root, Git status where available, root and workspace package manifests, `.npmrc`, lockfiles, TypeScript/Vite configuration, scripts, tests, effects, registry generation, and CI workflows.
2. Record the current directory and package structure while excluding generated and dependency directories from the source tree.
3. Identify all dependency directories and classify each by location, package ownership, linker configuration, and whether it appears required, expected, redundant, stale, or uncertain. Inspect before proposing cleanup.
4. Map each package's direct imports to dependencies declared by that package. Check internal `workspace:*` links, React/Remotion compatibility, tools, and accidental reliance on hoisting.
5. Inspect effect manifests, `packages/core` contracts, registry output, and generator scripts to establish the authoritative metadata source and generation command.
6. Read actual scripts before running checks. Establish a baseline for effect validation, registry generation, typecheck, lint, tests, API/gallery builds, and deployment where relevant. Record failures accurately.
7. If dependency installation is running or failed, inspect its status and error first. Stop a stuck operation before retrying; never run concurrent package-manager operations in one workspace. Do not repeatedly reinstall to solve a source-code error.

## Architecture guidance

- `apps/gallery` owns the user-facing UI, routing, search/filter controls, property editor, preview presentation, and integration interface.
- `packages/core` owns canonical shared effect types, schemas, and contracts. Do not duplicate or make core depend on applications.
- `packages/effects` owns self-contained effect implementations and their manifests. Contributors should not need a central hardcoded gallery registration for catalog discovery.
- `registry/effects.json` should be generated from effect manifests through one authoritative script. Do not maintain a second editable source of truth.
- Keep public catalog browsing static-first and independent of the backend. The browser must consume generated registry data rather than scan repository directories at runtime.
- Load only approved preview modules bundled into the frontend. Never evaluate or dynamically import arbitrary registry-provided code or paths.
- Keep package boundaries and tests practical for the current project size; do not reorganize solely for aesthetic consistency.

## Dependency and workspace changes

- A package declares every external runtime or development dependency it directly uses; do not rely on accidental root hoisting.
- Keep root-level tooling distinct from package-level runtime dependencies. Do not move every dependency to the workspace root.
- Before adding or changing a dependency, verify the importing package, package/version availability, compatibility, manifest declaration, lockfile change, and module resolution from that package.
- Align React and Remotion versions where required. For `@remotion/player`, inspect the actual preview contract and installed API before using it.
- Do not change pnpm linker strategy or package manager without evidence and an explicit compatibility rationale.
- Preserve the lockfile; update it with pnpm. Do not delete it to bypass a resolution error.
- When registry access fails, report the network/cache failure distinctly and avoid claiming installation succeeded.

## Safe implementation and verification

Classify findings by priority:

- **P0 — Safety/correctness:** broken builds, missing direct dependencies, invalid registry, broken workspace, unsafe scripts, deployment failure.
- **P1 — Structure:** duplicated source of truth, incorrect package boundaries, contract drift, redundant validation.
- **P2 — Efficiency:** unnecessary install/build work, safe dependency alignment, repeated expensive steps.
- **P3 — Optional:** additional organization, tooling, or UX improvements.

For each proposed change, identify evidence, root cause, benefit, risk, affected files, verification, and rollback. Implement one coherent change at a time. After each change, inspect its diff and run the smallest relevant check before proceeding.

For preview work, inspect the real effect exports and props, confirm Player API/types, use stable component references, validate inputs, and provide an accessible rendering-error fallback.

For GitHub Pages, verify Vite base path, assets, registry data, preview imports, routing/direct links, build output, and refresh behavior under a repository subpath. Use one routing strategy consistently.

## Required final report

Report:

- Current architecture and findings, including dependency-directory diagnosis when relevant.
- Changes and affected files; identify any files moved or removed and the evidence.
- Dependency and lockfile changes.
- Commands actually run and their real outcomes.
- Build, test, lint, registry, and effect-validation status where applicable.
- Remaining failures, distinguishing code defects from environment/network limitations.
- Risks, manual steps, and recommended next steps.

Never claim success for a check that did not complete.
