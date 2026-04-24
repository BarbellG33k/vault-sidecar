import * as esbuild from 'esbuild';
import { readdirSync } from 'fs';
import { join } from 'path';

const jsDir = 'src/assets/js';

// Find all .ts files in src/assets/js
const entryPoints = readdirSync(jsDir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(jsDir, f));

const args = process.argv.slice(2);
const watch = args.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints,
  outdir: jsDir,
  bundle: true,
  format: 'esm',
  target: 'es2020',
  sourcemap: true,
  splitting: false,
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[build-js] watching src/assets/js/*.ts');
} else {
  await esbuild.build(options);
  console.log('[build-js] built src/assets/js/*.ts');
}
