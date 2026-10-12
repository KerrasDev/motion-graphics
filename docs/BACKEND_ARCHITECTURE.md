# Motion Graphics Platform
## Backend Architecture, API Specification, and Scalability Design

**Document Type:** Technical Architecture and Implementation Specification  
**Project:** `motion-graphics`  
**Status:** Proposed Architecture  
**Architecture Style:** Modular Monolith  
**Primary Runtime:** Node.js  
**Primary Language:** TypeScript  
**API Style:** RESTful HTTP API  
**API Contract:** OpenAPI 3.1  
**Database:** PostgreSQL  
**Package Manager:** pnpm Workspaces  
**Frontend:** React, Vite, and Remotion  
**Deployment Strategy:** Static Frontend + Independently Deployed API

---

# 1. Executive Summary

## 1.1 Project Overview

Motion Graphics is an open-source ecosystem for discovering, previewing, integrating, publishing, and managing reusable motion graphics effects built with React and Remotion.

The platform consists of two primary products:

1. **Motion Graphics Gallery:** A public web application for discovering effects, viewing animated previews, inspecting metadata, copying integration instructions, and accessing source code.
2. **Motion Graphics Backend Platform:** An API-driven service responsible for dynamic metadata, version management, user accounts, favorites, community submissions, package distribution metadata, and future AI-assisted integration features.

The platform must support both anonymous visitors and authenticated contributors without requiring authentication for ordinary public browsing.

The architecture must remain simple during early development while providing a clear migration path toward higher traffic, asynchronous processing, and independently scalable services.

## 1.2 Architectural Objectives

The backend MUST satisfy the following objectives:

- Maintain a clear separation between HTTP transport, business logic, persistence, and external integrations.
- Support versioned, documented, and backward-compatible APIs.
- Preserve compatibility with the existing pnpm monorepo.
- Reuse shared TypeScript contracts where appropriate.
- Validate all external input at runtime.
- Keep public browsing available independently of user authentication.
- Separate effect metadata from source packages and large media assets.
- Support reproducible effect releases and immutable version artifacts.
- Provide secure contribution and publishing workflows.
- Support horizontal scaling without requiring a fundamental architectural rewrite.
- Keep operational complexity and infrastructure costs low during the initial release.
- Allow the frontend to remain statically deployable on GitHub Pages.

## 1.3 Non-Goals for the Initial Release

The initial implementation MUST NOT require:

- Microservices.
- Kubernetes.
- A mandatory Redis deployment.
- A mandatory message broker.
- A custom identity provider.
- A proprietary package registry.
- AI model inference inside the API process.
- Server-side execution of arbitrary submitted React components.
- Server-side rendering of user-submitted Remotion projects.

These capabilities may be introduced later when supported by measured requirements.

---

# 2. Architecture Principles

## 2.1 Modular Monolith

The backend SHALL initially be implemented as one deployable application with independently organized domain modules.

Each module owns its business rules, service interfaces, validation schemas, and persistence operations.

Modules MUST NOT directly depend on the internal implementation details of unrelated modules.

Recommended dependency direction:

```text
HTTP Routes
    |
    v
Application Services
    |
    v
Domain Rules and Contracts
    |
    v
Repository Interfaces
    |
    v
Infrastructure Implementations
```

The dependency direction may be adapted to practical TypeScript conventions, but business logic MUST NOT be tightly coupled to Fastify request objects, PostgreSQL drivers, or a particular cloud provider.

## 2.2 Stateless Application Instances

API instances SHOULD remain stateless.

The application MUST NOT depend on local process memory for persistent sessions, shared rate-limit counters, job state, or authoritative effect metadata.

Local memory MAY be used for short-lived request-scoped data and bounded caches.

Persistent and shared state belongs in external systems such as PostgreSQL, object storage, or a shared cache introduced later.

## 2.3 Contract-First Development

The API MUST have a documented OpenAPI contract.

Request parameters, request bodies, response structures, pagination, error formats, and authentication requirements MUST be explicitly defined.

Runtime validation schemas SHOULD be used to validate external data and should remain consistent with the documented contract.

## 2.4 Immutable Releases

Once an effect version is published, its package artifact and version metadata MUST NOT be silently overwritten.

Corrections SHOULD create a new version.

Existing releases must remain addressable through stable identifiers and immutable artifact checksums.

## 2.5 Progressive Infrastructure

Infrastructure MUST be introduced only when required by actual product capabilities or measured bottlenecks.

The initial architecture should work with:

- One API application.
- One PostgreSQL database when dynamic persistence becomes necessary.
- One object storage provider when package and media uploads are enabled.
- One static frontend deployment.

Redis, asynchronous workers, and distributed infrastructure are optional later additions.

---

# 3. Proposed Technology Stack

| Component | Technology | Responsibility |
|---|---|---|
| Runtime | Node.js LTS | Application execution |
| Language | TypeScript | Static typing |
| HTTP framework | Fastify | HTTP routing, plugins, request lifecycle |
| Schema validation | Zod | Runtime validation |
| API specification | OpenAPI 3.1 | API documentation and client generation |
| Database | PostgreSQL | Persistent relational data |
| ORM / Query Layer | Drizzle ORM | Typed database queries and migrations |
| Frontend | React + Vite | Public gallery |
| Animation runtime | Remotion | Effect previews and video composition |
| Testing | Vitest | Unit and integration tests |
| HTTP integration testing | Fastify injection | Route-level tests |
| Linting | ESLint | Static code quality checks |
| Formatting | Prettier, optional | Consistent source formatting |
| Logging | Pino through Fastify | Structured application logs |
| Object storage | S3-compatible storage | Packages, thumbnails, preview assets |
| CI | GitHub Actions | Validation, testing, and builds |
| Deployment | Static hosting + API hosting | Independent frontend/backend deployment |

### Dependency policy

Before adding dependencies, inspect the existing workspace and reuse installed libraries where appropriate.

The implementation MUST NOT introduce a second ORM, duplicate validation framework, or unnecessary HTTP framework.

The exact compatible package versions MUST be selected and pinned through the repository's lockfile.

---

# 4. Monorepo Structure

The backend SHALL be added to the existing repository without replacing working gallery code, effect packages, or workspace configuration.

Recommended target structure:

```text
motion-graphics/
├── apps/
│   ├── gallery/
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── config/
│   │   │   ├── plugins/
│   │   │   ├── modules/
│   │   │   │   ├── health/
│   │   │   │   ├── registry/
│   │   │   │   ├── effects/
│   │   │   │   ├── versions/
│   │   │   │   ├── categories/
│   │   │   │   ├── users/
│   │   │   │   ├── favorites/
│   │   │   │   ├── submissions/
│   │   │   │   ├── publishing/
│   │   │   │   └── admin/
│   │   │   ├── infrastructure/
│   │   │   │   ├── database/
│   │   │   │   ├── storage/
│   │   │   │   ├── email/
│   │   │   │   └── telemetry/
│   │   │   ├── shared/
│   │   │   │   ├── errors/
│   │   │   │   ├── http/
│   │   │   │   ├── security/
│   │   │   │   └── utilities/
│   │   │   └── types/
│   │   ├── migrations/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── workers/                 # Introduce only when needed
│
├── packages/
│   ├── core/
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── effects.ts
│   │   │   ├── versions.ts
│   │   │   ├── pagination.ts
│   │   │   ├── errors.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── effects/
│       ├── kinetic-title/
│       ├── number-counter/
│       └── data-chart/
│
├── registry/
│   └── effects.json
│
├── scripts/
├── tests/
├── Docs/
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── package.json
└── README.md
```

The effect names shown above are illustrative. The implementation MUST preserve existing effect identifiers and package locations.

## 4.1 Application Entry Points

`app.ts` MUST create and configure the Fastify application.

Responsibilities:

- Register plugins.
- Register API modules.
- Configure validation and serialization.
- Register error handlers.
- Configure CORS.
- Expose the OpenAPI document.
- Register health routes.
- Avoid binding to a network port.

`server.ts` MUST own the network lifecycle.

Responsibilities:

- Load configuration.
- Create the application.
- Bind to the configured host and port.
- Handle graceful shutdown.
- Close database connections.
- Stop accepting new requests during shutdown.

This separation allows the same application to be used in automated tests without starting a real TCP listener.

---

# 5. Domain Model

## 5.1 Core Entities

The initial domain model consists of:

- `Effect`
- `EffectVersion`
- `Category`
- `Tag`
- `EffectDependency`
- `User`
- `Favorite`
- `Submission`
- `Asset`
- `AuditEvent`

Not every entity must be backed by PostgreSQL immediately.

The initial read-only registry may use the existing generated JSON registry, provided that the backend uses a consistent data-access interface.

## 5.2 Effect

An effect represents a logical, reusable motion graphics component.

Suggested fields:

```text
id
slug
name
description
categoryId
authorId
license
visibility
status
latestVersion
createdAt
updatedAt
```

Requirements:

- `id` MUST be a stable identifier.
- `slug` MUST be unique and URL-safe.
- `status` MUST distinguish draft, published, deprecated, and archived states.
- `visibility` MUST distinguish public and private resources where private resources are supported.
- Public API queries MUST NOT expose unpublished effects to unauthorized users.
- Deleting an effect MUST NOT implicitly destroy published release artifacts.

## 5.3 EffectVersion

Each effect version represents an immutable release.

Suggested fields:

```text
id
effectId
version
releaseNotes
entryPoint
packageUrl
packageChecksum
packageSize
manifest
publishedAt
createdAt
```

Requirements:

- A release version MUST be unique within its effect.
- Semantic Versioning SHOULD be used for public releases.
- The package checksum MUST be calculated from the actual package bytes.
- Release metadata MUST record the supported framework and runtime requirements.
- Published artifacts MUST be immutable.
- Deprecation MUST be distinct from deletion.

## 5.4 Effect Metadata Contract

The canonical metadata contract MUST preserve compatibility with the existing effect definitions.

Example:

```json
{
  "id": "kinetic-title",
  "name": "Kinetic Title",
  "description": "An animated typography effect for video titles.",
  "category": "typography",
  "tags": ["title", "text", "kinetic"],
  "framework": "react",
  "runtime": "remotion",
  "version": "1.0.0",
  "entryPoint": "src/index.ts",
  "dependencies": [],
  "license": "MIT",
  "preview": {
    "type": "remotion",
    "compositionId": "KineticTitlePreview"
  },
  "propsSchema": {
    "title": {
      "type": "string",
      "default": "Hello World"
    },
    "durationInFrames": {
      "type": "number",
      "default": 90
    }
  }
}
```

This is a proposed API-facing example, not a replacement for the current schema. Before implementation, inspect the existing effect definitions and validator and adapt the contract without silently renaming required fields.

The metadata MUST distinguish between:

- Effect identity.
- Release-specific metadata.
- Preview configuration.
- Runtime dependencies.
- Licensing.
- Configurable properties.
- Distribution artifact information.

## 5.5 Category and Tag

Categories provide controlled classification.

Tags provide flexible discovery labels.

Categories SHOULD have stable slugs and display names. Tags SHOULD be normalized to avoid duplicate representations caused by case differences or whitespace.

The API MUST NOT assume that all tags are globally unique across unrelated namespaces unless that rule is explicitly defined.

## 5.6 User

A user represents an authenticated platform account.

Suggested fields:

```text
id
email
displayName
avatarUrl
role
status
createdAt
updatedAt
lastLoginAt
```

Roles SHOULD initially include:

- `user`
- `contributor`
- `moderator`
- `admin`

Authorization MUST use explicit permissions rather than relying exclusively on frontend visibility or role names.

## 5.7 Submission

A submission represents a proposed effect or a new release awaiting review.

Suggested states:

```text
draft
submitted
under_review
changes_requested
approved
rejected
published
withdrawn
```

State transitions MUST be validated server-side.

A user MUST NOT be able to publish directly by supplying a different status in a request body.

---

# 6. Database Architecture

## 6.1 Initial Storage Strategy

The system supports two implementation stages.

### Stage A: Static Registry

Use the existing generated `registry/effects.json` as the source for public effect discovery.

The API MAY read this registry through a repository abstraction.

This stage is appropriate when:

- Effects are maintained by repository contributors.
- Updates occur through Git-based workflows.
- User-generated publishing is not enabled.
- Persistent accounts and favorites are not yet required.

### Stage B: PostgreSQL

Introduce PostgreSQL when dynamic writes become necessary, such as:

- User accounts.
- Favorites.
- Submission workflows.
- Moderation.
- Release history.
- Administrative metadata.

The transition MUST preserve stable effect IDs and published version identifiers.

A migration script SHOULD import the existing registry into the database and validate record counts and identifier consistency.

The JSON registry SHOULD remain available for offline-first consumers and static deployments where practical.

## 6.2 Suggested Relational Schema

Illustrative PostgreSQL schema:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE effects (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES categories(id),
    author_id UUID REFERENCES users(id),
    license TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    visibility TEXT NOT NULL DEFAULT 'public',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE effect_versions (
    id UUID PRIMARY KEY,
    effect_id UUID NOT NULL REFERENCES effects(id),
    version TEXT NOT NULL,
    release_notes TEXT,
    package_url TEXT,
    package_checksum TEXT,
    package_size BIGINT,
    manifest JSONB NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (effect_id, version)
);

CREATE TABLE tags (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE effect_tags (
    effect_id UUID NOT NULL REFERENCES effects(id),
    tag_id UUID NOT NULL REFERENCES tags(id),
    PRIMARY KEY (effect_id, tag_id)
);

CREATE TABLE favorites (
    user_id UUID NOT NULL REFERENCES users(id),
    effect_id UUID NOT NULL REFERENCES effects(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, effect_id)
);

CREATE INDEX effects_status_idx
    ON effects (status);

CREATE INDEX effects_category_idx
    ON effects (category_id);

CREATE INDEX effect_versions_effect_idx
    ON effect_versions (effect_id);

CREATE INDEX favorites_user_idx
    ON favorites (user_id);
```

This schema is a starting point, not a complete migration.

Before production, the implementation MUST define:

- UUID generation strategy.
- Allowed status and role values.
- Cascading-delete policy.
- Database migration history.
- Ownership rules.
- Timestamp update strategy.
- Email verification and account lifecycle requirements.
- Uniqueness and normalization constraints.
- Transaction boundaries for publication.

The database MUST NOT be modified manually in production without an approved migration procedure.

## 6.3 Indexing Strategy

Indexes MUST be introduced based on query patterns.

Initial candidates:

- Unique index on effect slugs.
- Unique index on `(effect_id, version)`.
- Index on effect publication status.
- Index on category relationships.
- Composite index for favorites.
- Indexes for submission moderation queues.

For full-text search, PostgreSQL full-text search is sufficient for an initial implementation.

A dedicated search engine SHOULD NOT be introduced until measured search complexity or traffic justifies it.

## 6.4 Transaction Boundaries

A publication operation MUST be atomic from the perspective of database state.

For example, publishing a release may require:

1. Verifying that the submission is approved.
2. Creating the immutable release record.
3. Updating the effect's published state.
4. Recording an audit event.
5. Marking the submission as published.

These database changes SHOULD occur within one transaction.

Object storage uploads are external side effects and cannot automatically participate in the PostgreSQL transaction. Use a staged upload and publication workflow, with checksum verification and cleanup of abandoned artifacts.

---

# 7. REST API Design

## 7.1 Base URL

Production API:

```text
https://api.example.com/api/v1
```

Development API:

```text
http://localhost:3000/api/v1
```

The production domain is a placeholder and MUST be replaced with the configured deployment domain.

## 7.2 API Conventions

- Use RESTful resource-oriented paths.
- Use plural nouns for collection endpoints.
- Use HTTP methods according to their semantics.
- Use JSON for ordinary request and response bodies.
- Use UTC timestamps in ISO 8601 format.
- Use UUIDs for internal database identifiers where appropriate.
- Use stable public slugs for human-readable effect routes.
- Keep internal database identifiers distinct from public version strings.
- Use consistent error responses.
- Document authentication and authorization requirements.
- Support pagination for potentially large collections.
- Do not expose database records directly without response mapping.

## 7.3 API Versioning

All initial endpoints MUST be placed under `/api/v1`.

Breaking changes MUST NOT silently alter the response contract of existing versioned endpoints.

Additive fields may be introduced when they remain backward-compatible for clients that ignore unknown properties.

When a breaking change is unavoidable, introduce a new API version and document the deprecation timeline for the old version.

## 7.4 Pagination

Collection endpoints SHOULD use cursor-based pagination when records may grow significantly.

Example:

```http
GET /api/v1/effects?limit=20&cursor=opaque-token
```

Response:

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  }
}
```

Requirements:

- The default limit SHOULD be 20.
- The maximum limit SHOULD be 100.
- The server MUST validate the limit.
- The cursor MUST be treated as opaque client data.
- The server MUST NOT trust arbitrary SQL or ordering expressions supplied by the client.
- Cursor ordering MUST be deterministic.
- Cursor implementation SHOULD remain stable across pages when new records are inserted.

Offset pagination MAY be used for small, administrative collections where it is appropriate.

---

# 8. API Endpoint Specification

## 8.1 Health and Readiness

### `GET /health/live`

Purpose: Verify that the application process is alive.

Example response:

```json
{
  "status": "ok"
}
```

This endpoint MUST NOT require authentication.

It SHOULD NOT perform expensive database queries.

### `GET /health/ready`

Purpose: Determine whether the application can serve its intended traffic.

Example response:

```json
{
  "status": "ready",
  "checks": {
    "database": "ok"
  }
}
```

The database field applies when PostgreSQL is configured.

Readiness failures MUST return an appropriate non-success HTTP status.

Do not expose credentials, SQL statements, connection strings, or sensitive infrastructure details in health responses.

## 8.2 Effect Collection

### `GET /api/v1/effects`

Purpose: Retrieve published effects.

Query parameters:

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Search by name, description, or supported tags |
| `category` | string | Filter by category slug |
| `tag` | string | Filter by tag slug |
| `framework` | string | Filter by supported framework |
| `runtime` | string | Filter by execution runtime |
| `author` | string | Filter by public author identifier |
| `limit` | integer | Maximum number of results |
| `cursor` | string | Pagination cursor |
| `sort` | enum | Supported deterministic ordering |

Example request:

```http
GET /api/v1/effects?q=kinetic&category=typography&limit=20
```

Example response:

```json
{
  "data": [
    {
      "id": "effect_01",
      "slug": "kinetic-title",
      "name": "Kinetic Title",
      "description": "Animated typography for video titles.",
      "category": {
        "slug": "typography",
        "name": "Typography"
      },
      "tags": ["title", "text", "kinetic"],
      "latestVersion": "1.0.0",
      "license": "MIT",
      "preview": {
        "type": "remotion",
        "thumbnailUrl": null
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  }
}
```

The example is illustrative. The actual response MUST reflect the existing effect contract.

Rules:

- Return only published effects visible to the requesting user.
- Validate and normalize query parameters.
- Bound search length and page size.
- Do not expose private submissions.
- Use a deterministic sort order.
- Avoid returning large manifests or package contents in collection responses.

## 8.3 Effect Details

### `GET /api/v1/effects/:slug`

Purpose: Retrieve one effect and its current public metadata.

Example response:

```json
{
  "data": {
    "id": "effect_01",
    "slug": "kinetic-title",
    "name": "Kinetic Title",
    "description": "Animated typography for video titles.",
    "category": {
      "slug": "typography",
      "name": "Typography"
    },
    "tags": ["title", "text", "kinetic"],
    "latestVersion": "1.0.0",
    "license": "MIT",
    "repositoryUrl": null,
    "documentationUrl": null,
    "versionsUrl": "/api/v1/effects/kinetic-title/versions"
  }
}
```

Return `404 Not Found` if the effect does not exist or is not visible to the requesting user.

The API MUST NOT reveal whether an inaccessible private effect exists if doing so would violate the platform's privacy policy.

## 8.4 Effect Versions

### `GET /api/v1/effects/:slug/versions`

Purpose: List published versions of an effect.

Example response:

```json
{
  "data": [
    {
      "version": "1.0.0",
      "publishedAt": "2026-10-10T10:00:00.000Z",
      "packageSize": 24576,
      "checksum": "sha256:example",
      "deprecated": false
    }
  ],
  "pagination": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  }
}
```

Only published releases MUST appear in public responses.

### `GET /api/v1/effects/:slug/versions/:version`

Purpose: Retrieve metadata for a specific release.

The response MUST identify the exact immutable release, its compatibility requirements, dependency information, and package checksum where applicable.

A mutable `latest` alias MAY be supported for convenience, but it MUST resolve to a specific published version and MUST NOT replace explicit version pinning for reproducible integrations.

## 8.5 Package Download Metadata

### `GET /api/v1/effects/:slug/versions/:version/package`

Purpose: Retrieve package download information.

Example:

```json
{
  "data": {
    "version": "1.0.0",
    "downloadUrl": "https://storage.example.com/artifacts/...",
    "checksum": "sha256:...",
    "size": 24576,
    "expiresAt": "2026-10-10T11:00:00.000Z"
  }
}
```

For private artifacts, use short-lived signed URLs or an equivalent controlled download mechanism.

For public immutable artifacts, a CDN URL may be returned directly.

The backend SHOULD avoid proxying large artifacts through the API unless there is a specific requirement for that behavior.

The server MUST NOT accept arbitrary user-supplied download URLs and fetch them without strict validation. Such behavior could introduce Server-Side Request Forgery (SSRF) vulnerabilities.

## 8.6 Categories

### `GET /api/v1/categories`

Returns public effect categories.

Example:

```json
{
  "data": [
    {
      "slug": "typography",
      "name": "Typography",
      "description": "Text and title animation effects.",
      "effectCount": 12
    }
  ]
}
```

The `effectCount` MUST count only effects visible in the current public scope.

### `GET /api/v1/categories/:slug`

Returns category metadata and, optionally, a paginated collection of associated effects.

The endpoint MUST use the same visibility and pagination rules as the effect collection.

## 8.7 Authentication

Authentication MUST be implemented only when persistent user functionality is introduced.

Preferred initial approach:

- Use a maintained authentication provider or a well-established authentication library.
- Avoid implementing password cryptography, email verification, password reset, and account recovery from scratch.
- Use secure, HttpOnly cookies for browser sessions when supported by the deployment architecture.
- Apply CSRF protection to state-changing cookie-authenticated requests.
- If bearer tokens are used, define their expiration, rotation, revocation, and storage strategy.

### `GET /api/v1/auth/me`

Returns the current authenticated user.

### `POST /api/v1/auth/logout`

Invalidates the current session.

Login and account creation routes SHOULD be delegated to the chosen authentication integration where possible.

Authentication MUST NOT be required for public effect browsing.

## 8.8 Favorites

### `GET /api/v1/me/favorites`

Returns the current user's favorite effects.

Authentication: Required.

### `PUT /api/v1/me/favorites/:slug`

Adds an effect to the current user's favorites.

The operation SHOULD be idempotent.

### `DELETE /api/v1/me/favorites/:slug`

Removes an effect from the current user's favorites.

The server MUST derive the user identity from the authenticated session or token. It MUST NOT accept a trusted `userId` from the client as the authorization source.

## 8.9 Effect Submissions

### `POST /api/v1/submissions`

Purpose: Submit a new effect or a new release for review.

Authentication: Required.

Example request:

```json
{
  "effectSlug": "kinetic-title",
  "version": "1.1.0",
  "releaseNotes": "Improved timing controls.",
  "manifest": {
    "framework": "react",
    "runtime": "remotion",
    "license": "MIT",
    "dependencies": []
  }
}
```

The actual submission contract MUST be aligned with the canonical effect manifest.

Requirements:

- Validate the manifest against an explicit schema.
- Verify contributor permissions.
- Validate package metadata.
- Check license compatibility where applicable.
- Record the submission owner.
- Prevent unauthorized status transitions.
- Create an audit event for moderation-sensitive operations.
- Enforce submission size and frequency limits.

### `GET /api/v1/me/submissions`

Returns the current user's submissions.

### `GET /api/v1/submissions/:id`

Returns submission details only to authorized users.

Moderators and administrators MAY access submissions within their assigned permissions.

## 8.10 Moderation and Publishing

### `POST /api/v1/submissions/:id/review`

Purpose: Apply a moderation decision.

Authentication: Moderator or administrator.

Example request:

```json
{
  "decision": "changes_requested",
  "comment": "Please document the required Remotion version."
}
```

The server MUST validate the transition and record the reviewer identity.

### `POST /api/v1/submissions/:id/publish`

Purpose: Publish an approved release.

Authentication: Authorized publisher.

The operation MUST:

1. Verify that the submission is approved.
2. Validate the final package and manifest.
3. Verify the artifact checksum.
4. Create an immutable version record.
5. Update the effect's publication state.
6. Record an audit event.
7. Mark the submission as published.

The database state changes MUST be transactional.

Artifact upload and verification MUST be completed before the release becomes publicly discoverable.

The publishing endpoint MUST be idempotent or protected by an explicit idempotency mechanism to avoid duplicate releases during retries.

## 8.11 OpenAPI

The backend MUST expose an OpenAPI document, for example:

```http
GET /api/v1/openapi.json
```

Interactive API documentation MAY be available at a development-only route.

Production API documentation MUST NOT expose secrets, internal configuration, or administrative endpoints without appropriate access control.

---

# 9. Standard API Response and Error Contracts

## 9.1 Successful Responses

Collection response:

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  }
}
```

Single-resource response:

```json
{
  "data": {
    "id": "effect_01"
  }
}
```

The `data` field MUST contain a documented response representation rather than an unfiltered database object.

## 9.2 Error Response

Use a consistent error representation:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid parameters.",
    "requestId": "req_example",
    "details": [
      {
        "field": "limit",
        "code": "OUT_OF_RANGE"
      }
    ]
  }
}
```

Requirements:

- Error codes MUST be stable identifiers.
- Messages MUST NOT reveal secrets or internal stack traces.
- Validation details MUST avoid exposing sensitive input.
- Stack traces MUST be restricted to controlled server-side logs.
- Every request SHOULD have a correlation or request ID.
- Unexpected exceptions MUST be mapped to a safe generic response.

## 9.3 HTTP Status Codes

| Status | Meaning |
|---|---|
| `200 OK` | Successful retrieval or operation |
| `201 Created` | Resource created |
| `202 Accepted` | Asynchronous operation accepted |
| `204 No Content` | Successful operation without response body |
| `400 Bad Request` | Malformed or invalid request |
| `401 Unauthorized` | Authentication required or invalid |
| `403 Forbidden` | Authenticated but insufficient permission |
| `404 Not Found` | Resource not found or not visible |
| `409 Conflict` | State conflict or duplicate resource |
| `413 Content Too Large` | Upload exceeds configured limit |
| `415 Unsupported Media Type` | Unsupported content type |
| `422 Unprocessable Content` | Semantically invalid input |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server failure |
| `503 Service Unavailable` | Service or required dependency unavailable |

Use status codes consistently and document them in OpenAPI.

---

# 10. Application Module Design

Each domain module SHOULD use a consistent structure.

Example:

```text
modules/
└── effects/
    ├── effects.routes.ts
    ├── effects.schemas.ts
    ├── effects.service.ts
    ├── effects.repository.ts
    ├── effects.types.ts
    └── effects.test.ts
```

## 10.1 Routes

Routes handle HTTP-specific concerns:

- Path and query parameter validation.
- Authentication preconditions.
- Request-to-service mapping.
- Response status codes.
- Response serialization.

Routes MUST NOT contain large business workflows or complex SQL statements.

## 10.2 Services

Services implement application use cases:

- Discover effects.
- Retrieve a specific release.
- Add a favorite.
- Submit a release.
- Review a submission.
- Publish an approved version.

Services MUST enforce business rules regardless of whether a request originates from the public API, a worker, or an administrative process.

## 10.3 Repositories

Repositories abstract persistence operations.

Example interface:

```ts
export interface EffectRepository {
  listPublished(query: EffectListQuery): Promise<EffectPage>;

  findPublishedBySlug(
    slug: string
  ): Promise<PublishedEffect | null>;

  findVersion(
    slug: string,
    version: string
  ): Promise<PublishedEffectVersion | null>;
}
```

The interface is illustrative and MUST be adapted to the actual domain types.

Repositories SHOULD NOT return raw Fastify request objects or expose HTTP status codes.

## 10.4 Infrastructure Adapters

Infrastructure adapters implement integrations such as:

- PostgreSQL access.
- Object storage.
- Email delivery.
- Authentication providers.
- Telemetry exporters.
- External AI services.

Business services SHOULD depend on stable interfaces rather than cloud-specific SDK objects whenever practical.

---

# 11. Runtime Configuration

Configuration MUST be read from environment variables and validated at application startup.

Example:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3000

DATABASE_URL=

CORS_ORIGINS=http://localhost:5173

LOG_LEVEL=info

STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
```

This is an example template, not a production configuration.

Requirements:

- Never commit actual credentials.
- Provide `.env.example` containing placeholder values only.
- Validate required variables during startup.
- Fail fast when required production configuration is missing.
- Avoid printing secrets in logs.
- Use a secrets manager or protected deployment environment for production credentials.
- Use a separate database for tests where database integration tests are required.
- Do not assume that local environment variables exist in GitHub Actions or the deployment provider.

The application SHOULD support a read-only registry mode when PostgreSQL is not configured, provided that this mode is explicitly implemented and tested.

---

# 12. Security Architecture

Security requirements apply to every endpoint, not only authentication routes.

## 12.1 Input Validation

- Validate path parameters, query parameters, headers, and request bodies.
- Reject unsupported fields where strict schemas are appropriate.
- Bound string lengths, array sizes, pagination limits, and upload sizes.
- Normalize slugs and identifiers consistently.
- Treat manifests and uploaded metadata as untrusted input.
- Never interpolate untrusted values directly into SQL.
- Use parameterized queries and validated ordering options.

## 12.2 Authentication and Authorization

- Authentication establishes the caller's identity.
- Authorization determines which operations the caller may perform.
- The backend MUST enforce permissions independently of the frontend.
- Role checks SHOULD be combined with resource ownership checks.
- Administrative operations MUST be explicitly protected.
- Session revocation and expiration MUST be defined.
- Account recovery MUST be protected against enumeration and abuse.

## 12.3 CORS

CORS MUST allow only configured origins.

Development may allow the local Vite origin.

Production MUST use explicit trusted origins.

Do not use unrestricted wildcard origins with credentialed browser requests.

CORS is not an authentication mechanism and MUST NOT be treated as a substitute for authorization.

## 12.4 CSRF and Cookies

When using cookie-based authentication:

- Set `HttpOnly`.
- Set `Secure` in production.
- Select an appropriate `SameSite` policy.
- Validate CSRF tokens or use another suitable CSRF defense for state-changing requests.
- Validate trusted origins where appropriate.

The cookie and CORS design MUST account for whether the frontend and API are on the same site or different sites.

## 12.5 Rate Limiting

Apply rate limits according to risk and resource cost.

Initial candidates:

- Public search endpoints.
- Authentication endpoints.
- Submission endpoints.
- Upload initialization.
- Package publication.
- Expensive AI integration endpoints.

Rate limiting MUST be based on a reliable client identity strategy.

Behind a reverse proxy, forwarded client IP headers MUST be trusted only when the proxy configuration is explicitly controlled.

If the application scales to multiple instances, in-memory rate limits are insufficient for globally consistent enforcement. Introduce a shared store only when needed.

## 12.6 Upload Security

The upload pipeline MUST:

1. Authenticate the uploader.
2. Check submission permissions.
3. Validate expected file types and sizes.
4. Verify checksums.
5. Generate server-controlled object keys.
6. Prevent path traversal.
7. Avoid trusting client-supplied MIME types.
8. Keep unpublished artifacts private.
9. Scan or inspect packages according to the platform's threat model.
10. Publish only verified artifacts.
11. Enforce quotas and retention rules.

A file extension alone MUST NOT be treated as proof that an uploaded file is safe.

## 12.7 Untrusted Effect Code

React and Remotion effects may contain executable JavaScript.

The platform MUST NOT execute arbitrary contributor code inside the main API process.

If automated preview rendering is introduced, it MUST use a separate isolated execution environment with:

- Resource limits.
- Execution timeouts.
- Restricted filesystem access.
- Restricted network access.
- Controlled dependency installation.
- Temporary credentials, if any.
- Cleanup after execution.
- A defined policy for native binaries and package scripts.

The preview worker MUST NOT have unrestricted access to production credentials or the primary database.

## 12.8 Dependency Security

- Use a lockfile for reproducible installation.
- Review new runtime dependencies.
- Run dependency vulnerability checks in CI.
- Avoid executing untrusted package lifecycle scripts in privileged environments.
- Keep secrets out of build logs and generated artifacts.
- Define an update policy for vulnerable dependencies.

---

# 13. Object Storage and Artifact Distribution

Large packages, video previews, and thumbnails SHOULD be stored outside the API database.

## 13.1 Storage Abstraction

Define a storage interface:

```ts
export interface ObjectStorage {
  createUploadTarget(
    input: CreateUploadTargetInput
  ): Promise<UploadTarget>;

  getObjectMetadata(
    key: string
  ): Promise<StoredObjectMetadata | null>;

  createDownloadUrl(
    key: string,
    expiresInSeconds: number
  ): Promise<string>;

  deleteObject(key: string): Promise<void>;
}
```

The interface is illustrative. Its methods MUST be adapted to the selected provider and access model.

## 13.2 Upload Flow

Recommended flow:

```text
Contributor
    |
    v
POST /submissions
    |
    v
Backend validates permissions and manifest
    |
    v
Backend issues upload target
    |
    v
Contributor uploads artifact to object storage
    |
    v
Backend verifies artifact and checksum
    |
    v
Submission enters review workflow
    |
    v
Authorized publisher approves release
    |
    v
Immutable artifact becomes publicly available
```

The upload target SHOULD expire quickly and be limited to the intended object and operation.

## 13.3 CDN

Use a CDN for public immutable artifacts and media when bandwidth or geographic distribution justifies it.

Versioned asset paths SHOULD be immutable.

Mutable aliases, such as `latest`, SHOULD have explicit cache invalidation or short-lived cache policies.

Private assets MUST NOT become public merely because they are stored in a publicly readable bucket.

---

# 14. Caching Strategy

Caching MUST be introduced according to measured workload.

## 14.1 Public Metadata

Published effect metadata may use HTTP caching.

Example:

```http
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

This is an example policy, not a universal default.

The correct TTL depends on publication frequency and consistency requirements.

## 14.2 Immutable Releases

Version-specific metadata and immutable artifacts may use longer cache lifetimes.

Example:

```http
Cache-Control: public, max-age=31536000, immutable
```

Only use a one-year immutable cache policy when the URL identifies content that will never change.

## 14.3 User-Specific Responses

Favorites, profile data, and private submissions MUST NOT be publicly cached.

Use appropriate private or no-store cache directives where necessary.

## 14.4 Redis

Redis MAY be added for:

- Expensive repeated queries.
- Distributed rate limiting.
- Short-lived shared state.
- Job coordination.
- Cache invalidation patterns that justify the additional complexity.

Redis MUST NOT become the authoritative store for user accounts, published release metadata, or audit records.

---

# 15. Asynchronous Jobs

Long-running work MUST NOT block ordinary API requests indefinitely.

Potential future jobs include:

- Package inspection.
- Dependency metadata extraction.
- Preview thumbnail generation.
- Video preview rendering.
- License policy checks.
- AI-assisted integration analysis.
- Search indexing.

## 15.1 Job Model

An asynchronous job SHOULD have:

```text
id
type
status
createdAt
startedAt
completedAt
attemptCount
errorCode
resultReference
```

Possible states:

```text
queued
running
succeeded
failed
cancelled
```

## 15.2 Processing Requirements

- Jobs MUST be safe to retry where practical.
- Duplicate delivery MUST NOT create duplicate releases.
- Retry policies MUST use bounded attempts and backoff.
- Failed jobs MUST produce structured diagnostic records.
- Permanent failures MUST not retry indefinitely.
- Workers MUST enforce time and resource limits.
- Job results MUST be persisted when clients need to retrieve them.

A database-backed queue may be sufficient initially. Introduce a dedicated queue system only when throughput or operational requirements justify it.

---

# 16. Observability and Operations

## 16.1 Structured Logging

Use structured JSON logs.

Each request SHOULD include:

- Request ID.
- HTTP method.
- Route template.
- Response status.
- Duration.
- Relevant safe error code.

Do not log passwords, access tokens, session cookies, or private package contents.

## 16.2 Metrics

Track at least:

- Request count by route and status.
- Request latency.
- Error rate.
- Database connection utilization.
- Database query latency.
- Upload and download volume.
- Submission processing duration.
- Worker queue depth when workers are introduced.

Avoid using unbounded user-controlled values as metric labels.

## 16.3 Tracing

Distributed tracing is optional initially.

Introduce OpenTelemetry or an equivalent standard when diagnosing cross-service latency or asynchronous processing becomes difficult.

## 16.4 Operational Endpoints

- `/health/live`: process liveness.
- `/health/ready`: readiness to serve traffic.
- Metrics endpoint: private or appropriately protected when enabled.

Administrative diagnostics MUST NOT be publicly exposed without access controls.

---

# 17. Scalability Strategy

## 17.1 Stage 1: Static Gallery

```text
GitHub Pages
    |
    v
Generated Registry JSON
```

Use when effect metadata changes through repository commits and all public content can be generated at build time.

## 17.2 Stage 2: Read-Only API

```text
Static Gallery
    |
    v
Fastify API
    |
    v
Generated Registry / PostgreSQL
```

Use when a centralized search interface or runtime metadata endpoint is needed.

## 17.3 Stage 3: Dynamic Platform

```text
Gallery
   |
   v
API
   |
   +---- PostgreSQL
   |
   +---- Object Storage
   |
   +---- Authentication Provider
```

Use when accounts, favorites, submissions, or moderation become available.

## 17.4 Stage 4: Asynchronous Processing

```text
Gallery
   |
   v
API
   |
   +---- PostgreSQL
   |
   +---- Object Storage
   |
   +---- Job Queue
              |
              v
           Workers
              |
              v
       Isolated Processing
```

Use when rendering previews, inspecting packages, or other tasks require longer processing time.

## 17.5 Stage 5: Horizontal Scaling

```text
Clients
   |
   v
CDN / Reverse Proxy / Load Balancer
   |
   +----------+----------+
   |          |          |
   v          v          v
 API 1      API 2      API N
   |          |          |
   +----------+----------+
              |
              v
        Shared PostgreSQL
              |
              +---- Object Storage
              |
              +---- Shared Cache (optional)
```

Before horizontal scaling, ensure that:

- API instances are stateless.
- Database migrations are compatible with the deployment sequence.
- Shared rate limiting is used where required.
- Session storage is external or based on verifiable stateless tokens.
- Object storage is shared.
- Graceful shutdown works.
- Connection pool sizes account for the total number of instances.
- Background jobs use explicit ownership and retry semantics.

Do not assume that increasing the number of API instances automatically increases database capacity.

---

# 18. Performance Requirements

The initial service SHOULD target the following baseline under a documented test workload:

- Simple cached public metadata requests: p95 latency below 200 ms.
- Ordinary uncached metadata requests: p95 latency below 500 ms.
- Health checks: fast, predictable, and independent of expensive business queries.
- Pagination: bounded result size.
- Upload and download: streamed or transferred directly through object storage rather than buffered entirely in API memory.
- API process: no synchronous CPU-intensive rendering in request handlers.

These are provisional engineering targets, not guarantees. They MUST be measured under representative hardware, database size, concurrency, and network conditions.

Performance testing SHOULD record:

- Hardware and runtime versions.
- Dataset size.
- Concurrency.
- Request distribution.
- Cache state.
- p50, p95, and p99 latency.
- Error rate.
- Resource utilization.

Optimization decisions MUST be driven by measurements rather than assumptions.

---

# 19. Testing Strategy

## 19.1 Unit Tests

Test business rules independently of HTTP and PostgreSQL.

Examples:

- Effect visibility.
- Semantic version validation.
- Publication state transitions.
- Permission evaluation.
- Submission validation.
- Pagination token handling.

## 19.2 Route Tests

Use Fastify's injection capabilities to test:

- Valid requests.
- Invalid query parameters.
- Invalid request bodies.
- Missing authentication.
- Insufficient permissions.
- Missing resources.
- Error serialization.
- Rate-limit behavior where enabled.

## 19.3 Database Integration Tests

Use a dedicated test database or disposable database environment.

Verify:

- Unique constraints.
- Foreign-key behavior.
- Transactions.
- Publication consistency.
- Pagination ordering.
- Favorite idempotency.
- Migration correctness.

Do not run destructive integration tests against production data.

## 19.4 Contract Tests

Verify that:

- OpenAPI schemas match the intended responses.
- Shared Zod contracts are used consistently.
- Error responses follow the documented format.
- Generated clients, if used, compile successfully.
- Existing static registry consumers remain compatible.

## 19.5 End-to-End Tests

Test complete user workflows:

1. Browse effects anonymously.
2. Open an effect detail page.
3. Retrieve a specific version.
4. Authenticate.
5. Add and remove a favorite.
6. Submit a new effect.
7. Review a submission.
8. Publish a release.
9. Retrieve the published artifact metadata.

Workflows involving accounts and publishing may be introduced in later phases.

## 19.6 Security Tests

Test:

- Unauthorized administrative operations.
- Cross-user resource access.
- Malformed identifiers.
- Oversized request bodies.
- Unsafe upload metadata.
- Rate-limit enforcement.
- CSRF protections where applicable.
- SSRF-resistant external URL handling.
- Exposure of unpublished resources.

---

# 20. CI/CD and Deployment

## 20.1 Continuous Integration

GitHub Actions SHOULD run:

1. Dependency installation using the lockfile.
2. Effect metadata validation.
3. TypeScript checks.
4. Linting.
5. Unit tests.
6. API integration tests where configured.
7. Frontend production build.
8. Backend build.
9. OpenAPI validation.
10. Dependency security checks.

The workflow MUST fail if a required validation stage fails.

For reproducible CI installation, use:

```bash
pnpm install --frozen-lockfile
```

## 20.2 Frontend Deployment

The gallery SHOULD remain statically deployable on GitHub Pages.

The frontend MUST obtain its API base URL from build-time configuration or a controlled runtime configuration file.

The build MUST NOT contain database credentials, storage secret keys, or server-only authentication secrets.

The frontend MUST have an explicit fallback or documented behavior if the API is unavailable.

## 20.3 Backend Deployment

Deploy the API independently from the frontend.

The production environment MUST provide:

- A supported Node.js runtime.
- Environment configuration.
- HTTPS termination.
- Database access when required.
- Logging.
- Health checks.
- A graceful shutdown mechanism.
- Database migrations.
- Backup and restore procedures.
- A documented rollback strategy.

The hosting provider is an implementation choice and MUST NOT be hard-coded into business logic.

## 20.4 Database Migrations

Production migrations MUST be versioned and reviewed.

Use an expand-and-contract strategy for changes that must coexist with older application versions.

Avoid destructive schema changes in the same release that first introduces code depending on a new schema unless deployment ordering is explicitly controlled.

Database backup and restoration procedures MUST be tested, not merely documented.

---

# 21. Repository and Workspace Integration

The implementation MUST preserve the existing project configuration.

Before making changes:

1. Inspect `package.json`.
2. Inspect `pnpm-workspace.yaml`.
3. Inspect the current TypeScript configuration.
4. Inspect the effect metadata contracts.
5. Inspect `scripts/validate-effects.ts`.
6. Inspect `scripts/build-registry.ts`.
7. Inspect the existing test suite.
8. Inspect Vite and GitHub Actions configuration.
9. Determine whether the project already has Git history or a configured remote.
10. Create a backup or use a version-controlled working branch before substantial changes.

Add the API as a new workspace project rather than replacing the gallery.

Root-level commands SHOULD include clear scripts such as:

```text
dev
dev:api
dev:gallery
build
build:api
build:gallery
typecheck
lint
test
test:api
validate:effects
registry:build
check
```

Only add scripts that correspond to real, tested tasks.

The root `check` command MUST remain deterministic and should include the relevant validation stages for all active workspace projects.

Do not add a PostgreSQL dependency to the public gallery bundle.

---

# 22. Implementation Phases

## Phase 0: Repository Assessment

Deliverables:

- Architecture inventory.
- Existing effect contract analysis.
- Workspace dependency analysis.
- Deployment configuration assessment.
- Identified compatibility constraints.

Acceptance criteria:

- No existing functionality is removed.
- Current validation and build commands remain understood.
- The intended migration path is documented.

## Phase 1: Backend Foundation

Deliverables:

- `apps/api`.
- Fastify application factory.
- Environment validation.
- Structured logging.
- Centralized error handling.
- Health endpoints.
- OpenAPI document.
- Unit and route tests.

Acceptance criteria:

- API starts locally.
- API tests run without a production database.
- Invalid configuration fails clearly.
- Health routes return documented responses.

## Phase 2: Read-Only Registry API

Deliverables:

- Effect collection endpoint.
- Effect detail endpoint.
- Category endpoint.
- Version metadata endpoint.
- Pagination and filtering.
- Registry repository abstraction.

Acceptance criteria:

- Existing effect definitions can be represented without breaking their canonical schema.
- Only published effects are publicly exposed.
- Invalid requests return documented errors.
- The API can operate in static registry mode.

## Phase 3: PostgreSQL Persistence

Deliverables:

- Database schema.
- Versioned migrations.
- Drizzle repository implementations.
- Registry import utility.
- Database integration tests.

Acceptance criteria:

- Importing the registry preserves stable identifiers.
- Duplicate versions are rejected.
- Publication transactions preserve data consistency.
- Migration and rollback limitations are documented.

## Phase 4: Authentication and User Features

Deliverables:

- Authentication integration.
- User identity.
- Favorites.
- Authorization policies.
- Session security.
- Rate limits for sensitive operations.

Acceptance criteria:

- Public browsing remains anonymous.
- Users cannot access other users' private resources.
- Authorization is enforced server-side.
- Sensitive operations are tested.

## Phase 5: Community Publishing

Deliverables:

- Submission lifecycle.
- Package upload workflow.
- Artifact checksum verification.
- Moderation endpoints.
- Immutable release publishing.
- Audit events.

Acceptance criteria:

- Unapproved releases are not publicly discoverable.
- Published artifacts cannot be silently overwritten.
- Publication is idempotent.
- Uploaded files are subject to defined validation and resource limits.

## Phase 6: Production Hardening

Deliverables:

- Production deployment.
- Database backups.
- Restore tests.
- Monitoring and alerts.
- Security checks.
- Performance baselines.
- Rollback documentation.

Acceptance criteria:

- Production configuration is validated.
- Secrets are not exposed in source code or browser bundles.
- Health checks work under expected deployment conditions.
- Recovery and rollback procedures are documented and tested.

## Phase 7: Optional Distributed Processing

Deliverables:

- Job queue.
- Worker application.
- Isolated preview rendering.
- Retry and failure policies.
- Job status API.

This phase MUST NOT be implemented unless long-running processing becomes an actual requirement.

---

# 23. Definition of Done

The backend foundation is considered complete when:

- The API is a properly registered pnpm workspace project.
- Existing gallery and effect packages remain functional.
- The API has documented OpenAPI routes.
- Request validation is implemented.
- Errors use a consistent format.
- Health endpoints are tested.
- Registry endpoints return correct published metadata.
- Pagination is bounded and deterministic.
- Tests cover normal and invalid requests.
- TypeScript and lint checks pass.
- Production builds succeed.
- Configuration and secrets are handled safely.
- The README documents local development.
- CI runs the required validation steps.
- The frontend remains independently deployable.
- No unimplemented capability is falsely presented as production-ready.

---

# 24. Final Architectural Decision

The recommended initial implementation is:

```text
Frontend:
  React + Vite + Remotion
  Static deployment on GitHub Pages

Backend:
  Node.js + TypeScript
  Fastify
  Zod
  OpenAPI 3.1

Data:
  Existing generated registry initially
  PostgreSQL when dynamic persistence is required
  S3-compatible object storage for release artifacts

Architecture:
  Modular monolith
  Explicit module boundaries
  Repository abstraction
  Immutable effect releases
  Stateless API instances

Operations:
  pnpm workspaces
  Vitest
  GitHub Actions
  Structured logging
  Health checks
  Versioned database migrations
```

The system SHOULD begin with a read-only Registry API and a clean modular foundation. Authentication, PostgreSQL-backed user features, publishing, object storage, background workers, and distributed scaling SHOULD be added incrementally.

The central architectural objective is to preserve the simplicity of the current open-source project while allowing it to evolve into a community-driven motion graphics platform without coupling the gallery, effect packages, API, database, and rendering infrastructure into one inseparable application.
