const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function sitePath(path: string): string {
  if (!path.startsWith('/') || (base && (path === base || path.startsWith(`${base}/`)))) {
    return path;
  }
  return `${base}${path}`;
}
