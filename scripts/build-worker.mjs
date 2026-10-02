import { build } from 'esbuild';
import { resolve } from 'node:path';

await build({
  entryPoints: [resolve('src/scripts/admin.ts')],
  outfile: resolve('worker/admin-client.txt'),
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2022',
});
