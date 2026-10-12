type WorkspaceSession =
  | { authenticated: false }
  | {
      authenticated: true;
      user: { id: number; login: string; avatarUrl: string };
      csrfToken: string;
      expiresAt: string;
    };

export interface CreatedWorkspaceRepository {
  id: number;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  visibility: 'private' | 'public';
  commitSha: string;
  uploadedFileCount: number;
  uploadMode: 'workspace' | 'scaffold';
}

export interface WorkspaceUploadFile {
  path: string;
  content: string;
}

interface ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

export class WorkspaceApiError extends Error {
  constructor(message: string, readonly code: string | undefined) {
    super(message);
    this.name = 'WorkspaceApiError';
  }
}

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';

export const isWorkspaceApiConfigured = import.meta.env.DEV || Boolean(configuredApiBase);

function endpoint(path: string): string {
  return `${configuredApiBase}/api/v1${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await globalThis.fetch(endpoint(path), {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = payload as ErrorResponse;
    throw new WorkspaceApiError(
      error.error?.message ?? `Workspace request failed with status ${response.status}.`,
      error.error?.code,
    );
  }
  return payload as T;
}

export const workspaceApi = {
  getSession(): Promise<WorkspaceSession> {
    return request('/session');
  },

  createRepository(input: {
    name: string;
    description: string;
    private: boolean;
    files?: WorkspaceUploadFile[];
  }, csrfToken: string): Promise<CreatedWorkspaceRepository> {
    return request('/repositories', {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken },
      body: JSON.stringify(input),
    });
  },

  logout(csrfToken: string): Promise<{ authenticated: false }> {
    return request('/auth/logout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken },
    });
  },

  getGitHubStartUrl(): string {
    return endpoint('/auth/github/start');
  },
};
