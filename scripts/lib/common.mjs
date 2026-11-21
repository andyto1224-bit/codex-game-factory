import { constants } from 'node:fs';
import { access, lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const SLUG = /^[a-z_][a-z0-9_-]{0,63}$/;

export function parseArgs(argv, allowed) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith('--') || !allowed.includes(argument.slice(2))) throw new Error(`Unknown argument: ${argument}`);
    const key = argument.slice(2);
    const value = argv[++index];
    if (!value || value.startsWith('--') || Object.hasOwn(result, key)) throw new Error(`Expected one value for --${key}`);
    result[key] = value;
  }
  return result;
}

export function assertSlug(slug) {
  if (typeof slug !== 'string' || !SLUG.test(slug)) throw new Error('Expected a lowercase slug (a-z, 0-9, _, -; max 64 characters)');
  return slug;
}

export async function exists(target) {
  try { await access(target, constants.F_OK); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

export function contained(base, target) {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`Path must be a child of ${base}: ${target}`);
  }
  return path.resolve(target);
}

/** Reject symlinks through existing ancestors, including an apps/public root. */
export async function safePath(base, relative) {
  const resolvedBase = path.resolve(base);
  const target = contained(resolvedBase, path.resolve(resolvedBase, relative));
  let cursor = path.parse(resolvedBase).root;
  for (const segment of path.relative(cursor, target).split(path.sep)) {
    cursor = path.join(cursor, segment);
    try {
      const stat = await lstat(cursor);
      if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${cursor}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return target;
}

export async function appPath(slug) {
  assertSlug(slug);
  return safePath(ROOT, path.join('apps', slug));
}

export async function projectPath(args) {
  if (args.app && args.project) throw new Error('Use --app or --project, not both');
  if (args.app) return appPath(args.app);
  if (args.project) return safePath(ROOT, args.project);
  throw new Error('Required: --app <slug> (or --project <relative-path> for a template)');
}

export async function walk(directory, excluded = ['node_modules', '.git', 'playwright-report', 'test-results', '_artifacts']) {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in scanned output: ${target}`);
    if (entry.isDirectory()) {
      if (!excluded.includes(entry.name)) files.push(...await walk(target, excluded));
    } else if (entry.isFile()) files.push(target);
  }
  return files;
}

export async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit', shell: false, ...options });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code ?? signal})`)));
  });
}

export async function runPnpm(args, options = {}) {
  const require = createRequire(import.meta.url);
  const manifest = require.resolve('pnpm'); // pnpm 11 exports its package manifest at ".".
  const metadata = await readJson(manifest);
  const binary = path.resolve(path.dirname(manifest), metadata.bin.pnpm);
  await run(process.execPath, [binary, ...args], options);
}

export function isMain(metaUrl) {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}
export async function cli(action) {
  try { await action(); }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
