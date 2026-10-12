import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import type Redis from 'ioredis';
import { buildApp } from '../apps/api/src/app';
import { RedisWorkspaceSessionStore } from '../apps/api/src/modules/github-workspaces/session-store';
import type {
  GitHubWorkspaceSession,
  WorkspaceSessionStore,
} from '../apps/api/src/modules/github-workspaces/session-store';

class MemorySessionStore implements WorkspaceSessionStore {
  private readonly states = new Set<string>();
  private readonly sessions = new Map<string, GitHubWorkspaceSession>();

  async saveOAuthState(state: string, _ttlSeconds: number): Promise<void> {
    this.states.add(state);
  }

  async consumeOAuthState(state: string): Promise<boolean> {
    const exists = this.states.has(state);
    this.states.delete(state);
    return exists;
  }

  async saveSession(id: string, session: GitHubWorkspaceSession, _ttlSeconds: number): Promise<void> {
    this.sessions.set(id, session);
  }

  async getSession(id: string): Promise<GitHubWorkspaceSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}

const config = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  callbackUrl: 'https://api.example.test/api/v1/auth/github/callback',
  galleryOrigin: 'https://effects.example.test',
  nodeEnv: 'test' as const,
};

function cookieFromHeader(headers: string | string[] | undefined, name: string): string {
  const values = Array.isArray(headers) ? headers : headers ? [headers] : [];
  const cookie = values.find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Missing ${name} cookie.`);
  return cookie.split(';', 1)[0];
}

function githubMock() {
  const calls: Array<{ url: URL; method: string; body?: Record<string, unknown> }> = [];
  const fetchImpl: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof URL ? input : new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : undefined;
    calls.push({ url, method, body });

    if (url.hostname === 'github.com') {
      return Response.json({ access_token: 'server-only-token', token_type: 'bearer', expires_in: 3600 });
    }
    if (url.pathname === '/user') {
      return Response.json({ id: 123, login: 'motion-user', avatar_url: 'https://avatars.example.test/user.png' });
    }
    if (url.pathname === '/user/repos') {
      return Response.json({
        id: 456,
        name: 'effects-workspace',
        full_name: 'motion-user/effects-workspace',
        html_url: 'https://github.com/motion-user/effects-workspace',
        default_branch: 'main',
        owner: { login: 'motion-user' },
      });
    }
    if (url.pathname.endsWith('/git/ref/heads/main') && method === 'GET') {
      return Response.json({ object: { sha: 'base-commit' } });
    }
    if (url.pathname.endsWith('/git/commits/base-commit')) {
      return Response.json({ tree: { sha: 'base-tree' } });
    }
    if (url.pathname.endsWith('/git/trees')) {
      return Response.json({ sha: 'workspace-tree' });
    }
    if (url.pathname.endsWith('/git/commits') && method === 'POST') {
      return Response.json({ sha: 'workspace-commit' });
    }
    if (url.pathname.endsWith('/git/ref/heads/main') && method === 'PATCH') {
      return Response.json({});
    }
    return Response.json({ message: `Unexpected mock request: ${method} ${url.pathname}` }, { status: 500 });
  };
  return { calls, fetchImpl };
}

describe('GitHub workspace repository creation', () => {
  it('creates a private repository with a scaffold or validated workspace files', async () => {
    const store = new MemorySessionStore();
    const github = githubMock();
    const app = await buildApp({
      enabled: true,
      config,
      sessionStore: store,
      fetchImpl: github.fetchImpl,
    });

    try {
      const start = await app.inject({ method: 'GET', url: '/api/v1/auth/github/start' });
      expect(start.statusCode).toBe(302);
      const authorizationUrl = new URL(start.headers.location ?? '');
      const state = authorizationUrl.searchParams.get('state');
      expect(state).toBeTruthy();
      const oauthCookie = cookieFromHeader(start.headers['set-cookie'], 'motion_oauth_state_dev');

      const callback = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/github/callback?code=authorization-code&state=${state}`,
        headers: { cookie: oauthCookie },
      });
      expect(callback.statusCode).toBe(302);
      expect(callback.headers.location).toBe('https://effects.example.test/#/workspaces?github=connected');
      const sessionCookie = cookieFromHeader(callback.headers['set-cookie'], 'motion_session_dev');

      const sessionResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/session',
        headers: { cookie: sessionCookie, origin: config.galleryOrigin },
      });
      expect(sessionResponse.statusCode).toBe(200);
      const session = sessionResponse.json() as {
        authenticated: boolean;
        csrfToken: string;
        user: { login: string };
      };
      expect(session.authenticated).toBe(true);
      expect(session.user.login).toBe('motion-user');
      expect(sessionResponse.body).not.toContain('server-only-token');

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories',
        headers: {
          cookie: sessionCookie,
          origin: config.galleryOrigin,
          'x-csrf-token': session.csrfToken,
          'content-type': 'application/json',
        },
        payload: { name: 'effects-workspace', description: 'My effects', private: true },
      });
      expect(createResponse.statusCode).toBe(201);
      expect(createResponse.json()).toMatchObject({
        fullName: 'motion-user/effects-workspace',
        visibility: 'private',
        commitSha: 'workspace-commit',
      });

      const createRepositoryCall = github.calls.find((call) => call.url.pathname === '/user/repos');
      expect(createRepositoryCall?.body).toMatchObject({ private: true, auto_init: true });
      const treeCall = github.calls.find((call) => call.url.pathname.endsWith('/git/trees'));
      expect(treeCall?.body?.tree).toHaveLength(3);
      expect(github.calls.some((call) => call.url.pathname.endsWith('/git/ref/heads/main')
        && call.method === 'PATCH'
        && call.body?.force === false)).toBe(true);

      const workspaceResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories',
        headers: {
          cookie: sessionCookie,
          origin: config.galleryOrigin,
          'x-csrf-token': session.csrfToken,
          'content-type': 'application/json',
        },
        payload: {
          name: 'full-workspace',
          description: 'Current project source',
          private: true,
          files: [
            { path: 'README.md', content: '# Motion Graphics\n' },
            { path: 'apps/gallery/src/App.tsx', content: 'export default function App() {}\n' },
          ],
        },
      });
      expect(workspaceResponse.statusCode).toBe(201);
      expect(workspaceResponse.json()).toMatchObject({
        uploadMode: 'workspace',
        uploadedFileCount: 2,
      });

      const workspaceTreeCall = github.calls
        .filter((call) => call.url.pathname.endsWith('/git/trees'))
        .at(-1);
      expect(workspaceTreeCall?.body?.tree).toEqual([
        { path: 'README.md', mode: '100644', type: 'blob', content: '# Motion Graphics\n' },
        { path: 'apps/gallery/src/App.tsx', mode: '100644', type: 'blob', content: 'export default function App() {}\n' },
      ]);

      const requestCount = github.calls.length;
      const unsafeUpload = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories',
        headers: {
          cookie: sessionCookie,
          origin: config.galleryOrigin,
          'x-csrf-token': session.csrfToken,
          'content-type': 'application/json',
        },
        payload: {
          name: 'unsafe-workspace',
          private: true,
          files: [{ path: '../.env', content: 'SHOULD_NOT_UPLOAD=true' }],
        },
      });
      expect(unsafeUpload.statusCode).toBe(400);
      expect(github.calls).toHaveLength(requestCount);
    } finally {
      await app.close();
    }
  });

  it('rejects repository creation when the origin or CSRF token does not match', async () => {
    const store = new MemorySessionStore();
    const github = githubMock();
    const app = await buildApp({
      enabled: true,
      config,
      sessionStore: store,
      fetchImpl: github.fetchImpl,
    });
    const state = 'known-state';
    await store.saveOAuthState(state, 600);
    await store.saveSession('known-session', {
      accessToken: 'server-only-token',
      csrfToken: 'known-csrf',
      expiresAt: Date.now() + 60_000,
      user: { id: 123, login: 'motion-user', avatarUrl: 'https://avatars.example.test/user.png' },
    }, 60);

    try {
      const wrongOrigin = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories',
        headers: {
          cookie: 'motion_session_dev=known-session',
          origin: 'https://attacker.example.test',
          'x-csrf-token': 'known-csrf',
        },
        payload: { name: 'not-allowed' },
      });
      expect(wrongOrigin.statusCode).toBe(403);
      expect(wrongOrigin.json().error.code).toBe('ORIGIN_REJECTED');

      const wrongCsrf = await app.inject({
        method: 'POST',
        url: '/api/v1/repositories',
        headers: {
          cookie: 'motion_session_dev=known-session',
          origin: config.galleryOrigin,
          'x-csrf-token': 'wrong-csrf',
        },
        payload: { name: 'not-allowed' },
      });
      expect(wrongCsrf.statusCode).toBe(403);
      expect(wrongCsrf.json().error.code).toBe('CSRF_REJECTED');
      expect(github.calls).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it('reports the integration as disabled until server configuration is enabled', async () => {
    const app = await buildApp({ enabled: false });
    try {
      const response = await app.inject({ method: 'GET', url: '/api/v1/auth/github/start' });
      expect(response.statusCode).toBe(503);
      expect(response.json().error.code).toBe('GITHUB_WORKSPACE_DISABLED');
    } finally {
      await app.close();
    }
  });
});

describe('GitHub workspace Redis session storage', () => {
  it('encrypts session records and rejects modified ciphertext', async () => {
    const records = new Map<string, string>();
    const redis = {
      set: async (key: string, value: string) => {
        records.set(key, value);
        return 'OK';
      },
      get: async (key: string) => records.get(key) ?? null,
      del: async (key: string) => (records.delete(key) ? 1 : 0),
    } as unknown as Redis;
    const store = new RedisWorkspaceSessionStore(redis, Buffer.alloc(32, 7));
    const session: GitHubWorkspaceSession = {
      accessToken: 'sensitive-github-token',
      csrfToken: 'sensitive-csrf-token',
      expiresAt: 1_900_000_000_000,
      user: { id: 123, login: 'motion-user', avatarUrl: 'https://avatars.example.test/user.png' },
    };

    await store.saveSession('session-id', session, 3600);
    const storedRecord = records.get('motion-graphics:github:session:session-id');
    expect(storedRecord).toBeDefined();
    expect(storedRecord).not.toContain(session.accessToken);
    expect(storedRecord).not.toContain(session.csrfToken);
    await expect(store.getSession('session-id')).resolves.toEqual(session);

    records.set(
      'motion-graphics:github:session:session-id',
      `${storedRecord?.slice(0, -2)}aa`,
    );
    await expect(store.getSession('session-id')).rejects.toThrow();
  });
});
