import { randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { isWorkspaceUploadPathAllowed } from '@motion-graphics/core';
import { z } from 'zod';
import { GitHubApiError, githubRequest } from './github-api';
import type { GitHubWorkspaceSession, WorkspaceSessionStore } from './session-store';
import { createWorkspaceScaffold } from './workspace-scaffold';

const oauthStateTtlSeconds = 600;
const maxSessionTtlSeconds = 8 * 60 * 60;
const maxWorkspaceFileCount = 500;
const maxWorkspaceFileBytes = 256 * 1024;
const maxWorkspaceTotalBytes = 512 * 1024;
const apiUserSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  avatar_url: z.string().url(),
});
const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().int().positive().optional(),
  error: z.string().optional(),
});
const repositorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  full_name: z.string().min(1),
  html_url: z.string().url(),
  default_branch: z.string().min(1),
  owner: z.object({ login: z.string().min(1) }),
});
const workspaceFileSchema = z.object({
  path: z.string().min(1).max(500).refine(isWorkspaceUploadPathAllowed),
  content: z.string(),
}).strict();
const workspaceFilesSchema = z.array(workspaceFileSchema).min(1).max(maxWorkspaceFileCount)
  .superRefine((files, context) => {
    const paths = new Set<string>();
    let totalBytes = 0;

    files.forEach((file, index) => {
      const normalizedPath = file.path.toLowerCase();
      if (paths.has(normalizedPath)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'path'],
          message: 'Workspace file paths must be unique.',
        });
      }
      paths.add(normalizedPath);

      const fileBytes = Buffer.byteLength(file.content, 'utf8');
      totalBytes += fileBytes;
      if (fileBytes > maxWorkspaceFileBytes) {
        context.addIssue({
          code: 'custom',
          path: [index, 'content'],
          message: 'Workspace files must be 256 KiB or smaller.',
        });
      }
    });

    if (totalBytes > maxWorkspaceTotalBytes) {
      context.addIssue({
        code: 'custom',
        message: 'The selected workspace must be 512 KiB or smaller.',
      });
    }
  });
const createRepositorySchema = z.object({
  name: z.string().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/)
    .refine((name) => name !== '.' && name !== '..', 'Repository name is invalid.'),
  description: z.string().max(350).default(''),
  private: z.boolean().default(true),
  files: workspaceFilesSchema.optional(),
}).strict();

export interface GitHubWorkspaceConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  galleryOrigin: string;
  nodeEnv: 'development' | 'test' | 'production';
}

export interface GitHubWorkspaceRoutesOptions {
  enabled: boolean;
  config?: GitHubWorkspaceConfig;
  sessionStore?: WorkspaceSessionStore;
  fetchImpl?: typeof globalThis.fetch;
}

function errorResponse(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, string | number | boolean>,
) {
  return reply.code(statusCode).send({
    error: {
      code,
      message,
      retryable: statusCode >= 500,
      ...(details ? { details } : {}),
    },
  });
}

function clearCookie(reply: FastifyReply, name: string, secure: boolean) {
  reply.clearCookie(name, {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
  });
}

function getCookieNames(nodeEnv: GitHubWorkspaceConfig['nodeEnv']) {
  return nodeEnv === 'production'
    ? { session: '__Host-motion_session', state: '__Host-motion_oauth_state', secure: true }
    : { session: 'motion_session_dev', state: 'motion_oauth_state_dev', secure: false };
}

function safeGitHubError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
) {
  if (!(error instanceof GitHubApiError)) {
    request.log.error({ err: error }, 'GitHub workspace request failed');
    return errorResponse(reply, 502, 'GITHUB_UNAVAILABLE', 'GitHub could not complete the request.');
  }

  request.log.warn({ status: error.status, requestId: error.requestId }, 'GitHub API rejected workspace request');
  if (error.status === 401) {
    return errorResponse(reply, 401, 'AUTH_EXPIRED', 'Reconnect GitHub to continue.');
  }
  if (error.status === 403) {
    return errorResponse(reply, 403, 'GITHUB_PERMISSION_DENIED', 'The GitHub App does not have the required permission.');
  }
  if (error.status === 404) {
    return errorResponse(reply, 404, 'GITHUB_RESOURCE_NOT_FOUND', 'The requested GitHub resource was not found.');
  }
  if (error.status === 409 || error.status === 422) {
    return errorResponse(reply, 409, 'REPOSITORY_NAME_UNAVAILABLE', 'That repository name is unavailable or cannot be created.');
  }
  if (error.status === 429) {
    return errorResponse(reply, 429, 'RATE_LIMITED', 'GitHub is rate limiting requests. Try again later.');
  }
  return errorResponse(reply, 502, 'GITHUB_UNAVAILABLE', 'GitHub could not complete the request.');
}

function requestHasValidOrigin(request: FastifyRequest, galleryOrigin: string): boolean {
  return request.headers.origin === galleryOrigin;
}

function getSessionId(request: FastifyRequest, cookieName: string): string | null {
  return request.cookies[cookieName] ?? null;
}

async function getSession(
  request: FastifyRequest,
  store: WorkspaceSessionStore,
  cookieName: string,
): Promise<{ id: string; value: GitHubWorkspaceSession } | null> {
  const id = getSessionId(request, cookieName);
  if (!id) return null;
  const value = await store.getSession(id);
  return value ? { id, value } : null;
}

async function exchangeAuthorizationCode(
  fetchImpl: typeof globalThis.fetch,
  config: GitHubWorkspaceConfig,
  code: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetchImpl('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    }),
  });

  const payload = tokenResponseSchema.safeParse(await response.json());
  if (!response.ok || !payload.success || payload.data.error) {
    throw new Error('GitHub authorization could not be completed.');
  }
  if (payload.data.token_type.toLowerCase() !== 'bearer') {
    throw new Error('GitHub returned an unsupported authorization token.');
  }
  return {
    accessToken: payload.data.access_token,
    expiresIn: payload.data.expires_in ?? maxSessionTtlSeconds,
  };
}

async function createRepositoryAndScaffold(
  fetchImpl: typeof globalThis.fetch,
  session: GitHubWorkspaceSession,
  input: z.infer<typeof createRepositorySchema>,
) {
  const rawRepository = await githubRequest(fetchImpl, session.accessToken, 'POST', '/user/repos', {
    name: input.name,
    description: input.description.trim(),
    private: input.private,
    auto_init: true,
    has_issues: false,
    has_wiki: false,
  });
  const repository = repositorySchema.parse(rawRepository);
  const encodedBranch = encodeURIComponent(repository.default_branch);
  const refPath = `/repos/${repository.owner.login}/${repository.name}/git/ref/heads/${encodedBranch}`;

  const rawRef = await githubRequest(fetchImpl, session.accessToken, 'GET', refPath);
  const ref = z.object({ object: z.object({ sha: z.string().min(1) }) }).parse(rawRef);
  const rawCommit = await githubRequest(
    fetchImpl,
    session.accessToken,
    'GET',
    `/repos/${repository.owner.login}/${repository.name}/git/commits/${ref.object.sha}`,
  );
  const baseCommit = z.object({ tree: z.object({ sha: z.string().min(1) }) }).parse(rawCommit);
  const files = input.files ?? createWorkspaceScaffold({
    name: input.name,
    description: input.description,
    defaultBranch: repository.default_branch,
  });
  const rawTree = await githubRequest(
    fetchImpl,
    session.accessToken,
    'POST',
    `/repos/${repository.owner.login}/${repository.name}/git/trees`,
    {
      base_tree: baseCommit.tree.sha,
      tree: files.map((file) => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        content: file.content,
      })),
    },
  );
  const tree = z.object({ sha: z.string().min(1) }).parse(rawTree);
  const rawNewCommit = await githubRequest(
    fetchImpl,
    session.accessToken,
    'POST',
    `/repos/${repository.owner.login}/${repository.name}/git/commits`,
    {
      message: input.files ? 'Upload Motion Graphics workspace' : 'Initialize Motion Graphics workspace',
      tree: tree.sha,
      parents: [ref.object.sha],
    },
  );
  const commit = z.object({ sha: z.string().min(1) }).parse(rawNewCommit);

  await githubRequest(fetchImpl, session.accessToken, 'PATCH', refPath, {
    sha: commit.sha,
    force: false,
  });

  return {
    id: repository.id,
    name: repository.name,
    fullName: repository.full_name,
    url: repository.html_url,
    defaultBranch: repository.default_branch,
    visibility: input.private ? 'private' : 'public',
    commitSha: commit.sha,
    uploadedFileCount: files.length,
    uploadMode: input.files ? 'workspace' : 'scaffold',
  };
}

export async function registerGitHubWorkspaceRoutes(
  app: FastifyInstance,
  options: GitHubWorkspaceRoutesOptions,
) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const config = options.config;
  const store = options.sessionStore;
  const unavailable = !options.enabled || !config || !store;
  const cookieNames = getCookieNames(config?.nodeEnv ?? 'development');

  await app.register(cookie);
  if (config) {
    await app.register(cors, {
      origin: config.galleryOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['content-type', 'x-csrf-token'],
    });
  }

  app.get('/api/v1/auth/github/start', async (_request, reply) => {
    if (unavailable || !config || !store) {
      return errorResponse(reply, 503, 'GITHUB_WORKSPACE_DISABLED', 'GitHub workspace integration is not configured.');
    }

    const state = randomBytes(32).toString('base64url');
    await store.saveOAuthState(state, oauthStateTtlSeconds);
    reply.setCookie(cookieNames.state, state, {
      path: '/',
      httpOnly: true,
      secure: cookieNames.secure,
      sameSite: 'lax',
      maxAge: oauthStateTtlSeconds,
    });

    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', config.clientId);
    authorizeUrl.searchParams.set('redirect_uri', config.callbackUrl);
    authorizeUrl.searchParams.set('state', state);
    return reply.redirect(authorizeUrl.toString());
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/v1/auth/github/callback',
    async (request, reply) => {
      if (unavailable || !config || !store) {
        return errorResponse(reply, 503, 'GITHUB_WORKSPACE_DISABLED', 'GitHub workspace integration is not configured.');
      }

      const stateCookie = request.cookies[cookieNames.state];
      clearCookie(reply, cookieNames.state, cookieNames.secure);
      if (request.query.error) {
        return reply.redirect(`${config.galleryOrigin}/#/workspaces?github=cancelled`);
      }
      if (!request.query.code || !request.query.state || request.query.state !== stateCookie) {
        return reply.redirect(`${config.galleryOrigin}/#/workspaces?github=invalid_state`);
      }

      const validState = await store.consumeOAuthState(request.query.state);
      if (!validState) {
        return reply.redirect(`${config.galleryOrigin}/#/workspaces?github=invalid_state`);
      }

      try {
        const { accessToken, expiresIn } = await exchangeAuthorizationCode(fetchImpl, config, request.query.code);
        const rawUser = await githubRequest(fetchImpl, accessToken, 'GET', '/user');
        const user = apiUserSchema.parse(rawUser);
        const sessionTtlSeconds = Math.min(expiresIn, maxSessionTtlSeconds);
        const expiresAt = Date.now() + sessionTtlSeconds * 1000;
        const session: GitHubWorkspaceSession = {
          accessToken,
          csrfToken: randomBytes(32).toString('base64url'),
          expiresAt,
          user: {
            id: user.id,
            login: user.login,
            avatarUrl: user.avatar_url,
          },
        };
        const sessionId = randomBytes(32).toString('base64url');
        await store.saveSession(sessionId, session, sessionTtlSeconds);
        reply.setCookie(cookieNames.session, sessionId, {
          path: '/',
          httpOnly: true,
          secure: cookieNames.secure,
          sameSite: 'lax',
          maxAge: sessionTtlSeconds,
        });
        return reply.redirect(`${config.galleryOrigin}/#/workspaces?github=connected`);
      } catch (error) {
        request.log.error({ err: error }, 'GitHub authorization callback failed');
        return reply.redirect(`${config.galleryOrigin}/#/workspaces?github=failed`);
      }
    },
  );

  app.get('/api/v1/session', async (request, reply) => {
    if (unavailable || !config || !store) {
      return errorResponse(reply, 503, 'GITHUB_WORKSPACE_DISABLED', 'GitHub workspace integration is not configured.');
    }

    const current = await getSession(request, store, cookieNames.session);
    if (!current) return { authenticated: false };
    if (current.value.expiresAt <= Date.now()) {
      await store.deleteSession(current.id);
      clearCookie(reply, cookieNames.session, cookieNames.secure);
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: current.value.user,
      csrfToken: current.value.csrfToken,
      expiresAt: new Date(current.value.expiresAt).toISOString(),
    };
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    if (unavailable || !config || !store) {
      return errorResponse(reply, 503, 'GITHUB_WORKSPACE_DISABLED', 'GitHub workspace integration is not configured.');
    }
    if (!requestHasValidOrigin(request, config.galleryOrigin)) {
      return errorResponse(reply, 403, 'ORIGIN_REJECTED', 'The request origin is not allowed.');
    }

    const current = await getSession(request, store, cookieNames.session);
    if (current && request.headers['x-csrf-token'] !== current.value.csrfToken) {
      return errorResponse(reply, 403, 'CSRF_REJECTED', 'The security token is missing or invalid.');
    }
    if (current) await store.deleteSession(current.id);
    clearCookie(reply, cookieNames.session, cookieNames.secure);
    return { authenticated: false };
  });

  app.post<{ Body: unknown }>('/api/v1/repositories', { bodyLimit: 2 * 1024 * 1024 }, async (request, reply) => {
    if (unavailable || !config || !store) {
      return errorResponse(reply, 503, 'GITHUB_WORKSPACE_DISABLED', 'GitHub workspace integration is not configured.');
    }
    if (!requestHasValidOrigin(request, config.galleryOrigin)) {
      return errorResponse(reply, 403, 'ORIGIN_REJECTED', 'The request origin is not allowed.');
    }

    const current = await getSession(request, store, cookieNames.session);
    if (!current) {
      return errorResponse(reply, 401, 'AUTH_REQUIRED', 'Connect GitHub before creating a repository.');
    }
    if (request.headers['x-csrf-token'] !== current.value.csrfToken) {
      return errorResponse(reply, 403, 'CSRF_REJECTED', 'The security token is missing or invalid.');
    }
    if (current.value.expiresAt <= Date.now()) {
      await store.deleteSession(current.id);
      clearCookie(reply, cookieNames.session, cookieNames.secure);
      return errorResponse(reply, 401, 'AUTH_EXPIRED', 'Reconnect GitHub to continue.');
    }

    const parsed = createRepositorySchema.safeParse(request.body);
    if (!parsed.success) {
      return errorResponse(
        reply,
        400,
        'INVALID_REPOSITORY_REQUEST',
        'Provide valid repository details and, if uploading files, a safe UTF-8 workspace within the upload limits.',
      );
    }

    try {
      const result = await createRepositoryAndScaffold(fetchImpl, current.value, parsed.data);
      return reply.code(201).send(result);
    } catch (error) {
      if (error instanceof GitHubApiError) {
        if (error.status === 401) {
          await store.deleteSession(current.id);
          clearCookie(reply, cookieNames.session, cookieNames.secure);
        }
        return safeGitHubError(request, reply, error);
      }

      request.log.error({ err: error }, 'Repository scaffold creation failed');
      return errorResponse(
        reply,
        502,
        'SCAFFOLD_UPLOAD_FAILED',
        'GitHub created the repository, but the workspace scaffold could not be uploaded. The repository may be empty or partially initialized.',
      );
    }
  });
}
