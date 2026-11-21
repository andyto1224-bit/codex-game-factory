import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { appPath, cli, isMain, parseArgs, runPnpm, safePath } from './lib/common.mjs';
import { auditProject } from './audit-perf.mjs';

export async function deployStatic({ app, platform = 'mock' }) {
  if (!['mock', 'web', 'gd', 'gm', 'poki'].includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
  const project = await appPath(app);
  await safePath(project, 'dist');
  // Vite emptyOutDir cleans only this app's output; never invoke a platform shell.
  await runPnpm(['--dir', project, 'run', 'build'], {
    env: { ...process.env, NODE_ENV: 'production', VITE_PLATFORM: platform },
  });
  const release = { app, platform, builtAt: new Date().toISOString(), adapter: 'mock', sdkIntegrated: false, entry: './index.html' };
  await writeFile(path.join(project, 'dist', 'release.json'), `${JSON.stringify(release, null, 2)}\n`);
  await auditProject({ app });
  console.log(`Static output ready: apps/${app}/dist (target=${platform}, mock adapter; no upload performed)`);
  return release;
}

if (isMain(import.meta.url)) await cli(() => deployStatic(parseArgs(process.argv.slice(2), ['app', 'platform'])));
