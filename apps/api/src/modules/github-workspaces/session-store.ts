import { Buffer } from 'node:buffer';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type Redis from 'ioredis';

export interface GitHubWorkspaceSession {
  accessToken: string;
  csrfToken: string;
  expiresAt: number;
  user: {
    id: number;
    login: string;
    avatarUrl: string;
  };
}

export interface WorkspaceSessionStore {
  saveOAuthState(state: string, ttlSeconds: number): Promise<void>;
  consumeOAuthState(state: string): Promise<boolean>;
  saveSession(id: string, session: GitHubWorkspaceSession, ttlSeconds: number): Promise<void>;
  getSession(id: string): Promise<GitHubWorkspaceSession | null>;
  deleteSession(id: string): Promise<void>;
  close?(): Promise<void>;
}

function oauthStateKey(state: string): string {
  const digest = createHash('sha256').update(state).digest('hex');
  return `motion-graphics:github:oauth-state:${digest}`;
}

function sessionKey(id: string): string {
  return `motion-graphics:github:session:${id}`;
}

function encryptSession(session: GitHubWorkspaceSession, encryptionKey: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final(),
  ]);

  return JSON.stringify({
    version: 1,
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  });
}

function decryptSession(stored: string, encryptionKey: Buffer): GitHubWorkspaceSession {
  const envelope = JSON.parse(stored) as {
    version?: unknown;
    iv?: unknown;
    authTag?: unknown;
    ciphertext?: unknown;
  };
  if (envelope.version !== 1
    || typeof envelope.iv !== 'string'
    || typeof envelope.authTag !== 'string'
    || typeof envelope.ciphertext !== 'string') {
    throw new Error('Stored GitHub workspace session has an invalid encrypted envelope.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(envelope.iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext) as GitHubWorkspaceSession;
}

export class RedisWorkspaceSessionStore implements WorkspaceSessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly encryptionKey: Buffer,
  ) {
    if (encryptionKey.length !== 32) {
      throw new Error('GitHub workspace session encryption key must be 32 bytes.');
    }
  }

  async saveOAuthState(state: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(oauthStateKey(state), '1', 'EX', ttlSeconds);
  }

  async consumeOAuthState(state: string): Promise<boolean> {
    return (await this.redis.getdel(oauthStateKey(state))) !== null;
  }

  async saveSession(id: string, session: GitHubWorkspaceSession, ttlSeconds: number): Promise<void> {
    await this.redis.set(sessionKey(id), encryptSession(session, this.encryptionKey), 'EX', ttlSeconds);
  }

  async getSession(id: string): Promise<GitHubWorkspaceSession | null> {
    const stored = await this.redis.get(sessionKey(id));
    if (!stored) return null;
    return decryptSession(stored, this.encryptionKey);
  }

  async deleteSession(id: string): Promise<void> {
    await this.redis.del(sessionKey(id));
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
