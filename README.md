# Motion Graphics

Motion Graphics is a local-first registry of reusable Remotion effects for video projects. It provides searchable, copy-friendly components that can be used directly in a Remotion composition without requiring a cloud rendering service or AI API keys.

## Features

- Search and filter effects by name, description, category, and tag
- Preview effects and customize manifest-declared properties
- Copy integration examples generated from effect metadata
- Create a private-by-default GitHub workspace repository scaffold
- Browse getting-started and contribution documentation
- Add new effects without editing the core library
- Validate effect metadata and generated registry automatically

## Stack

- React + TypeScript
- Vite + pnpm workspaces
- Remotion
- Zod for metadata validation
- Vitest + ESLint + Prettier

## Installation

```bash
corepack enable
pnpm install
```

## Development

```bash
pnpm dev
```

Open the gallery in the browser and explore the available effects.
The static gallery uses hash-based routes so detail pages work on GitHub Pages without server-side route rewrites.

The gallery's documentation is available at `/#/docs`; contribution instructions are at `/#/docs/contributing`.
The GitHub workspace entry is at `/#/workspaces`; it requires the separately hosted API and is not available in the Pages-only build unless configured.

## Adding an effect

Create a new directory under `packages/effects/<effect-id>/` and include:

- `index.tsx`
- `preview.tsx`
- `effect.json`
- `README.md`

Then run:

```bash
pnpm validate:effects
pnpm registry:build
```

## Existing project usage

Import the effect component from the registry or from the package exports and pass props matching the effect contract. All examples are intentionally predictable and easy to port into existing Remotion compositions.

## Contribution process

Please review `CONTRIBUTING.md` before opening a pull request.

## Production build

The production gallery is a static Vite site; it does not require the API server at runtime.

```bash
pnpm install --frozen-lockfile
pnpm registry:build
pnpm check
pnpm build
```

The gallery build output is `apps/gallery/dist/`.

## GitHub workspace repository creation

The workspace flow creates a repository in the connected user's personal GitHub account and uploads three starter files (`motion-workspace.json`, `README.md`, and `effects/README.md`) in one Git commit. New repositories default to private. Choosing public is explicit; no license is added automatically. The browser does not receive or store the GitHub access token.

The GitHub App must support user authorization and have repository **Administration: read/write** and **Contents: read/write** permissions to create the repository and initialize its files. These permissions are powerful; keep the App private during setup and authorize it only for the intended user/repositories. Organization repository creation is not included in this first version.

Configure these server-side API environment variables:

```text
GITHUB_WORKSPACE_ENABLED=true
GITHUB_APP_CLIENT_ID=...
GITHUB_APP_CLIENT_SECRET=...
GITHUB_APP_CALLBACK_URL=https://api.example.com/api/v1/auth/github/callback
GITHUB_GALLERY_ORIGIN=https://effects.example.com
GITHUB_SESSION_REDIS_URL=rediss://...
GITHUB_SESSION_ENCRYPTION_KEY=<64 hexadecimal characters>
```

Use the real HTTPS origins, a TLS-protected managed Redis service, and secret storage provided by the API host. Generate a unique 32-byte session-encryption key and provide it as 64 hexadecimal characters. Redis session records are encrypted with AES-256-GCM; changing this key invalidates existing sessions, so users must reconnect. Do not commit the client secret, Redis credentials, or encryption key, and do not use `VITE_*` variables for secrets. The API session expires with the GitHub authorization token (up to eight hours); users can reconnect after expiry.

Set the GitHub App's **User authorization callback URL** to the exact callback URL above. Set the API host's secrets/variables from the list. For the Pages build, set the repository Actions variable `VITE_API_BASE_URL` to the API origin (for example `https://api.example.com`). The deployment workflow exposes only this public API origin to Vite. The API must allow credentials from the exact `GITHUB_GALLERY_ORIGIN`; wildcard credentialed CORS is not supported.

In local development, run the API and gallery separately. The Vite dev server proxies `/api` to `http://127.0.0.1:4000` by default; override that target with `API_PROXY_TARGET` if necessary. Keep `GITHUB_WORKSPACE_ENABLED=false` until local GitHub App and Redis configuration is ready.

Repository creation uses GitHub's authenticated-user repository endpoint and then the Git database API to upload the scaffold as one commit. If repository creation succeeds but scaffold initialization fails, the API reports an explicit partial-completion error; check the GitHub account before retrying the same repository name.

## Deploying to GitHub Pages

### Prerequisites

- Node.js 22 (the project supports Node.js 20.18 or newer).
- pnpm 9.15.0, enabled through Corepack.
- A GitHub repository where GitHub Actions and Pages are available.

For local development:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

For a local production build, run `pnpm build`. Local builds use the site root (`/`).

### Repository setup and automatic deployment

1. Push the project to GitHub. The deployment workflow runs on pushes to `main` and derives the repository path from GitHub's workflow context; no owner or repository name is hardcoded. The `main` branch must be the repository's default branch for the deploy job to publish.
2. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source.
3. Push to `main`. The deployment workflow installs the frozen lockfile, regenerates and validates the effect registry, runs checks and the production build, then deploys `apps/gallery/dist/`.
4. Pull requests run validation and build checks but are not deployed.
5. Open the **Actions** tab and confirm the deployment workflow succeeded. Use the URL reported by the `github-pages` environment.

Manual runs are available through **Actions → Deploy Motion Graphics to GitHub Pages → Run workflow**. Deployment is limited to the repository's default branch. If the repository uses another default branch, update the workflow's `push.branches` list to match it.

For a GitHub Pages project site, the build automatically uses `/<repository>/`. A user or organization site named `<owner>.github.io` uses `/`. If using a custom domain, configure it in **Settings → Pages** and add the repository Actions variable `VITE_BASE_PATH` with the value `/`; the build will then use root-relative assets. Preserve GitHub's generated or configured `CNAME` file if one is required.

### Troubleshooting

- If the site returns 404s for JavaScript or CSS, confirm that Pages is configured to use **GitHub Actions** and that `VITE_BASE_PATH` is unset for project sites or matches the deployment root and ends with `/`.
- If a custom-domain deployment still requests assets under `/<repository>/`, set the Actions variable `VITE_BASE_PATH` to `/` and rerun the workflow.
- Hash-based effect URLs include `/#/effects/<effect-id>`; they remain refreshable without server rewrite configuration.
- GitHub repository settings and deployment permissions must be configured by a repository administrator. This project cannot change them from the workflow.

New effects reach the public gallery after their pull request is merged into the default branch and the Pages deployment workflow succeeds.

## Licensing

This project is distributed under the MIT License. Any third-party assets included in example effects must be used with compatible licensing and should be clearly documented in the effect README.
