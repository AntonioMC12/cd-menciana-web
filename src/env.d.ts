declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
declare module '*.txt' {
  const value: string;
  export default value;
}
