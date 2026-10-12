const excludedDirectoryNames = new Set([
  '.git',
  '.ssh',
  '.aws',
  '.cache',
  '.next',
  '.turbo',
  '.vite',
  '.vscode-test',
  '.pnpm-store',
  'coverage',
  'node_modules',
  'dist',
]);

const excludedFileNames = new Set([
  '.ds_store',
  '.npmrc',
  '.netrc',
  '.pypirc',
]);

export function isWorkspaceUploadPathAllowed(path: string): boolean {
  if (!path || path.length > 500 || path.startsWith('/') || /^[a-z]:/i.test(path)
    || path.includes('\\') || path.includes('\0')) {
    return false;
  }

  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return false;
  }

  return segments.every((segment) => {
    const normalized = segment.toLowerCase();
    return !excludedDirectoryNames.has(normalized)
      && !excludedFileNames.has(normalized)
      && !normalized.startsWith('.env')
      && !normalized.endsWith('.log')
      && !normalized.endsWith('.pem')
      && !normalized.endsWith('.key')
      && !normalized.endsWith('.p12')
      && !normalized.endsWith('.pfx')
      && !normalized.startsWith('credentials.')
      && !normalized.includes('service-account');
  });
}
