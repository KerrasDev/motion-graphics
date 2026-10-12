# GitHub Workspace Authentication and Synchronization Design

**Status:** Initial repository-scaffold flow implemented; repository loading, local editing, and synchronization remain future work  
**Scope:** GitHub App user authorization, private-by-default repository creation, and a safe path to later workspace editing and synchronization  
**Frontend:** Static React/Vite gallery on a custom domain  
**API:** Existing Fastify service on a sibling custom-domain subdomain  
**Source of truth:** GitHub repositories; browser storage contains only local drafts

## 1. Current state and constraints

The gallery is a static Vite application with hash routing. The Fastify API exposes health and built-in effect catalog routes. It now also supports an opt-in GitHub App user-authorization flow, Redis-backed server sessions, and private-by-default creation of a personal repository initialized with workspace starter files. Repository browsing, existing repository loading, editing, and synchronization are not implemented.

The API and browser therefore need an explicit production origin before synchronization can ship. This design assumes same-site sibling origins such as:

- Gallery: `https://effects.example.com`
- API: `https://api.example.com`

Use the actual domains through deployment configuration; the example domains are placeholders. The API remains independently deployed and is not part of the GitHub Pages artifact.

The GitHub-backed workspace is separate from the built-in catalog. Private or user-owned effects must never enter `registry/effects.json` or the public catalog automatically.

## 2. Recommended GitHub authorization model

Use a GitHub App, rather than asking users to paste personal access tokens or using a broadly scoped OAuth App.

The App should request only:

- **Metadata: read** — required for repository discovery.
- **Contents: read** — for the first, read-only repository-loading milestone.
- **Contents: write** — added only when multi-file saves are implemented.
- **Pull requests: write** — added only if creating pull requests becomes an implemented feature.

Allow installation on selected repositories. Organization installations may require an organization administrator. Explain this before redirecting users.

The GitHub App client ID and client secret remain API-only secrets. Never put them in `VITE_*` variables, browser storage, URLs, logs, or GitHub Pages artifacts. The implemented flow exchanges the OAuth authorization code on the API and stores the user access token only in the protected Redis session. The API never returns it to the browser.

## 3. Browser session, CORS, and CSRF

Use a host-only cookie scoped to the API host, for example `__Host-motion_session`, with:

- `Secure`
- `HttpOnly`
- `SameSite=Lax`
- `Path=/`
- No `Domain` attribute

Sibling HTTPS subdomains are same-site, although they are different origins. The gallery must call the API with credentials enabled; the API must allow credentials only for the exact configured gallery origin. Do not use wildcard CORS origins with credentials.

For state-changing requests:

1. Require an exact allowlisted `Origin` matching the gallery origin.
2. Require a per-session CSRF token returned by the session endpoint and echoed in a request header.
3. Reject missing or mismatched origin and CSRF values.

Use a cryptographically random, one-time OAuth/install `state`, bind it to the initiating browser, validate it on callback, and expire it quickly. Do not put installation tokens or session secrets in query parameters.

### Session storage requirement

Define a `SessionStore` interface for pending authorization state and authenticated sessions. Production must use a shared, protected store with TTL and logout/revocation support. Do not rely on process memory for production sessions because it is lost on restart and is not shared across API instances.

Session records contain the GitHub account identity, user access token, expiry, and CSRF material—not the App client secret. The Redis payload is encrypted with AES-256-GCM using a dedicated 32-byte API secret. Redis must use TLS in production. Rotating the encryption key invalidates current sessions, requiring users to reconnect. Delete the server-side session on logout. Keep the store separate from repository file storage; GitHub remains the source of truth for source files.

Local development may use an in-memory adapter only when explicitly running in development mode. Production startup must fail clearly if required App credentials, allowed gallery origin, callback URL, or session-store configuration is missing.

## 4. Authentication flow

1. The user selects **Connect GitHub** in the gallery.
2. The browser navigates to `GET /api/v1/auth/github/start`.
3. The API creates one-time, browser-bound state in Redis and redirects to the GitHub App user-authorization page.
4. GitHub redirects to `GET /api/v1/auth/github/callback`.
5. The API validates and consumes state, exchanges the authorization code server-side, fetches the authenticated user, creates a Redis session, sets the secure API-host cookie, then redirects to the fixed gallery workspace route.
6. The gallery requests `GET /api/v1/session` with credentials and receives only safe user identity, session expiry, and a CSRF token.
7. On logout, `POST /api/v1/auth/logout` validates origin and CSRF, invalidates the server-side session, and clears the cookie.

Validate callback parameters and GitHub responses. Do not redirect to a caller-provided URL. Handle installation cancellation, revoked access, expired authorization, and organization approval with user-safe error codes.

## 5. API boundary

Keep the existing `/api/effects` endpoints unchanged for compatibility. Add a separate versioned namespace for authenticated workspace functionality:

| Method | Endpoint | Initial purpose |
|---|---|---|
| `GET` | `/api/v1/session` | Return safe current-session identity and CSRF token |
| `GET` | `/api/v1/auth/github/start` | Start GitHub App user authorization |
| `GET` | `/api/v1/auth/github/callback` | Validate callback and establish session |
| `POST` | `/api/v1/auth/logout` | Revoke server-side session |
| `POST` | `/api/v1/repositories` | Create a personal repository and initialize its workspace scaffold |
| `POST` | `/api/v1/workspaces/open` | Load a selected repository and branch read-only |
| `POST` | `/api/v1/workspaces/sync` | Fetch remote state and compare it with a local base snapshot |

Repository identity must be a GitHub repository ID, not a caller-trusted owner/name pair. Resolve the repository through the authenticated installation before reading it. Every endpoint must validate the session, installation permission, path, response size, and GitHub error mapping.

Use a consistent error object, for example:

```json
{
  "error": {
    "code": "SYNC_CONFLICT",
    "message": "The remote branch changed after this workspace was opened.",
    "retryable": false,
    "details": {
      "conflictingPaths": ["effects/kinetic-title/index.tsx"]
    }
  }
}
```

Never return raw secret-bearing GitHub responses, access tokens, private keys, or internal stack traces.

## 6. Workspace loading and file safety

The initial repository contract should reuse the existing effect schema in `packages/core` and add a separate, versioned `motion-workspace.json` schema. Do not change existing effect manifests merely to fit the illustrative format in the proposal.

For the first loader:

1. Resolve the selected branch to its current commit SHA.
2. Load the repository tree and locate the workspace manifest.
3. Validate the workspace format version and effects directory.
4. Discover effect folders without requiring a manually maintained list.
5. Validate each effect manifest, including ID-to-directory agreement, unique IDs, entry/preview existence, and safe relative paths.
6. Load supported text files on demand and record their remote blob SHA and base commit SHA.
7. Keep invalid-effect diagnostics local to that effect where workspace integrity permits; do not silently include an invalid effect.

Set explicit limits before implementation for file count, per-file bytes, total bytes, and effect count. Support UTF-8 source, JSON, and Markdown first. Treat binary assets as a separate workflow. Reject absolute paths, traversal, symlinks, unsupported tree objects, and paths outside the configured effects root.

The browser must not execute arbitrary repository code in the gallery origin. Phase 1 supports discovery and diagnostics only. Previewing editable remote TSX is a separate security milestone requiring an isolated runtime, a dependency allowlist, no GitHub credentials in that context, and explicit failure/time limits.

## 7. Read-only sync before write access

Ship read-only GitHub loading before any commit endpoint. Model the local workspace with:

- Repository ID, owner/name for display, and branch.
- Base commit SHA.
- File path, local content, base blob SHA, and dirty/deleted state.
- Local workspace/session ID.

On sync, retrieve current remote versions and perform a three-way comparison:

- Local unchanged, remote changed: offer remote update; never replace dirty content silently.
- Local changed, remote unchanged: mark eligible to save in a later write milestone.
- Both changed identically: mark as already synchronized.
- Both changed differently, or delete/change mismatch: report a conflict with base/local/remote versions.

Persist drafts locally in IndexedDB only after the local-workspace milestone. Never persist GitHub credentials in IndexedDB or localStorage. A network failure must not discard local edits.

## 8. Safe multi-file commit milestone

Do not implement writes until read-only loading, session security, path validation, request limits, and conflict reporting are tested.

When enabled, a save must:

1. Freeze a snapshot of intended changes and require explicit user confirmation.
2. Recheck installation permission and target repository/branch.
3. Fetch the latest branch commit and compare each changed path against its base blob SHA.
4. Stop and return structured conflicts if a changed path diverged.
5. Return success without creating a commit when there are no changes.
6. Create all blobs, one tree, and one commit using the latest remote tree as its base.
7. Update the branch reference with `force: false`; never force-push.
8. If the ref update fails because the branch advanced, fetch again and re-evaluate conflicts with bounded retries.
9. Update the client base snapshot only after the API confirms the commit SHA.

Use an operation ID for uncertain network outcomes. Before retrying a save whose response may have been lost, check whether the corresponding commit has already reached the branch. Do not blindly retry an update or create duplicate commits.

Direct-branch commits and pull-request publication are separate modes. PR creation should be a later milestone and require explicit user action. Never merge automatically or publish private workspace content into the built-in public registry.

## 9. Configuration and deployment contract

Use server-only environment/configuration for:

- GitHub App ID and client ID.
- GitHub App private key.
- Callback URL.
- Exact gallery origin.
- Session-store connection/secret.
- API host/port and production mode.

Use a public, non-secret gallery setting for the API origin. Validate it at startup/build time and document the production URL. GitHub Pages continues to host only static assets; API hosting must provide HTTPS and secret management.

Use a custom domain with sibling subdomains so browser sessions remain same-site. Configure DNS/TLS, GitHub Pages custom-domain settings, API CORS, and the GitHub App callback URL to match exactly. Do not silently fall back to permissive CORS or unauthenticated write routes when production configuration is missing.

## 10. Incremental delivery

### Milestone A — Repository scaffold flow (implemented, configuration required)

- Create private-by-default repositories in the authenticated user's personal account.
- Upload `motion-workspace.json`, `README.md`, and `effects/README.md` in one Git commit.
- Keep tokens on the API and session state in Redis.
- The feature stays disabled until `GITHUB_WORKSPACE_ENABLED=true` and the required server variables are supplied.

### Milestone B — Contracts and validation

- Add workspace manifest schema/types to `packages/core`.
- Add repository-relative path helpers and workspace/effect discovery.
- Test schema versions, duplicate IDs, invalid paths, missing files, and per-effect invalid diagnostics.

### Milestone C — Local workspace

- Add IndexedDB draft persistence, multi-file editing, dirty-state tracking, recovery, import/export.
- Keep GitHub optional.
- Preview only trusted built-in effects at this stage.

### Milestone D — GitHub read-only repository loading

- Extend the configured App and session flow with repository/branch listing.
- Load and validate supported files read-only.
- Add request limits, typed API contracts, mocked GitHub tests, and security tests.

### Milestone E — Conflict-aware atomic commits

- Add write permission only when ready.
- Implement base-SHA comparisons, one-commit multi-file changes, non-forced ref updates, idempotency, and conflict UI.

### Milestone F — Pull requests and isolated preview

- Add optional PR creation and a secure preview runtime after independent security design/review.

## 11. Required tests before production auth

- Authorization state is unpredictable, one-time, browser-bound, and expires.
- Invalid callback state and installation IDs are rejected.
- Session cookie flags, expiration, logout invalidation, and missing session behavior are correct.
- CORS allows only the configured gallery origin; no wildcard credentialed origin.
- Missing or mismatched origin/CSRF header rejects mutations.
- Installation access is verified for each requested repository.
- Repository and branch IDs cannot be substituted to access unauthorized data.
- GitHub rate limits, revoked installation, timeout, malformed responses, and oversized trees map to safe errors.
- Path traversal, symlinks, binary data in text APIs, and configured size limits are rejected.
- Local dirty files are never overwritten automatically.
- Save tests cover concurrent branch movement, deletion conflicts, empty changes, ref-update failures, and uncertain retries.

## 12. Decisions and blockers before implementation

Confirmed by the product direction:

- Use a GitHub App with selected-repository permissions.
- Host the gallery and API on sibling HTTPS subdomains.
- Default newly created personal repositories to private.
- Keep GitHub source files authoritative and local drafts in IndexedDB.
- Do not upload existing built-in effects as part of creating a workspace.

Still required before live production use:

- Provision the real gallery/API domain names and API host.
- Configure the GitHub App user-authorization callback and repository Administration/Contents write permissions.
- Configure production secret storage, a TLS-protected Redis URL, and a dedicated 32-byte session-encryption key.
- Set initial file/effect/response limits.
- Decide whether the first editor milestone includes only built-in preview or a separately isolated remote-code preview (recommended: built-in preview only).

The repository creation/scaffold API is implemented but has not been tested against a real GitHub App or Redis service. Existing repository loading, effect-file upload, editor, and synchronization are not implemented. No credentials are included in the repository.
