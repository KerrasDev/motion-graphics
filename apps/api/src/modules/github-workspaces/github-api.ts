export class GitHubApiError extends Error {
  constructor(
    readonly status: number,
    readonly requestId: string | null,
  ) {
    super('The GitHub API request failed.');
    this.name = 'GitHubApiError';
  }
}

const apiRoot = 'https://api.github.com';
const apiVersion = '2022-11-28';

export async function githubRequest(
  fetchImpl: typeof globalThis.fetch,
  accessToken: string,
  method: 'GET' | 'POST' | 'PATCH',
  pathname: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetchImpl(new URL(pathname, apiRoot), {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': apiVersion,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status, response.headers.get('x-github-request-id'));
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
}
