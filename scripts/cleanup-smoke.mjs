import { rm } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, appPath, cli, contained, exists, isMain, readJson } from './lib/common.mjs';

/** Deliberately accepts no user-supplied deletion path. */
export async function cleanupSmoke() {
  const target = await appPath('_smoke-test');
  if (!await exists(target)) return;
  const manifest = await readJson(path.join(target, 'package.json'));
  if (manifest.name !== '@factory/_smoke-test' || manifest.dependencies?.['@factory/game-core'] !== 'workspace:*') {
    throw new Error('Refusing cleanup: directory is not the generated factory smoke project');
  }
  await rm(contained(path.join(ROOT, 'apps'), target), { recursive: true, force: true });
  console.log('Removed generated apps/_smoke-test.');
}

if (isMain(import.meta.url)) await cli(cleanupSmoke);
