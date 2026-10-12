import path from 'node:path';

export function resolveEffectPath(effectDirectory: string, declaredPath: string): string {
  if (!declaredPath.startsWith('./') || declaredPath.includes('\\')) {
    throw new Error(`Effect file path must be a relative path starting with ./: ${declaredPath}`);
  }

  const segments = declaredPath.slice(2).split('/');
  if (segments.length === 0 || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Effect file path contains an invalid relative segment: ${declaredPath}`);
  }

  const effectRoot = path.resolve(effectDirectory);
  const resolvedPath = path.resolve(effectRoot, ...segments);
  const relativePath = path.relative(effectRoot, resolvedPath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new Error(`Effect file path escapes its effect directory: ${declaredPath}`);
  }

  return resolvedPath;
}
