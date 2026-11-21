import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { appPath, cli, isMain, parseArgs, runPnpm, safePath } from './lib/common.mjs';
import { auditProject } from './audit-perf.mjs';

/**
 * 为指定目标生成本地静态产物并审计；不会上传远端或自动接入真实平台 SDK。
 * VITE_PLATFORM 仅用于公开的目标标记，不能承载任何密钥。
 */
export async function deployStatic({ app, platform = 'mock' }) {
  if (!['mock', 'web', 'gd', 'gm', 'poki'].includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
  const project = await appPath(app);
  await safePath(project, 'dist');
  // Vite emptyOutDir 仅清理当前项目输出；直接用 Node 执行包管理器，不调用 Shell。
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
