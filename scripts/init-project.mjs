import { cp, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ROOT, appPath, assertSlug, cli, contained, exists, isMain, parseArgs, readJson, safePath } from './lib/common.mjs';

export async function initProject({ name, template = 'pixi-ts', skills = '' }) {
  assertSlug(name);
  if (template !== 'pixi-ts') throw new Error('Only the validated pixi-ts template is installed');
  const selected = [...new Set(skills.split(',').map((value) => value.trim()).filter(Boolean))];
  for (const skill of selected) {
    if (!['puzzle', 'roguelike'].includes(skill)) throw new Error(`Unknown genre skill: ${skill}`);
    if (!await exists(path.join(ROOT, 'skills', 'genres', `${skill}.md`))) throw new Error(`Missing genre skill: ${skill}`);
  }
  const target = await appPath(name);
  const alreadyExists = await exists(target);
  if (alreadyExists) {
    const entries = await readdir(target);
    if (entries.some((entry) => entry !== '_artifacts')) throw new Error(`Project already exists; refusing to overwrite: ${name}`);
    if (await exists(path.join(target, '_artifacts'))) await safePath(target, '_artifacts');
  }
  const apps = path.join(ROOT, 'apps');
  await mkdir(apps, { recursive: true });
  const staging = await safePath(ROOT, path.join('apps', `.init-${randomUUID()}`));
  try {
    await cp(path.join(ROOT, 'templates', template), staging, {
      recursive: true,
      filter: (source) => !['node_modules', 'dist', '_artifacts', 'playwright-report', 'test-results', 'AGENTS.md'].includes(path.basename(source)),
    });
    const manifest = await readJson(path.join(staging, 'package.json'));
    manifest.name = `@factory/${name}`;
    await writeFile(path.join(staging, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await mkdir(path.join(staging, '_artifacts'), { recursive: true });
    const references = ['../../AGENTS.md', '../../skills/foundation/web-game-arch.md', '../../skills/foundation/monetization-platform.md', '../../skills/foundation/qa-and-perf.md', '../../skills/polish/game-ui-ux.md', '../../skills/polish/game-feel.md', ...selected.map((skill) => `../../skills/genres/${skill}.md`)];
    await writeFile(path.join(staging, 'AGENTS.md'), `# ${name} · 局部执行协议\n\n先读取并遵守以下规范（均相对此目录）：\n${references.map((file) => `- [${file}](${file})`).join('\n')}\n\n优先级：本项目 _artifacts/*.md > 根 skills/genres/*.md > 根 skills/foundation/*.md > 根 AGENTS.md。\n每次会话只执行一个阶段，按根协议停在人审门禁；不复制 @factory/game-core。所有命令从仓库根运行，--app ${name}。\n`);
    if (!alreadyExists) await rename(staging, target);
    else {
      // Preserve pre-approved design artifacts in-place; rollback only files we create.
      await mkdir(path.join(target, '_artifacts'), { recursive: true });
      const moved = [];
      try {
        for (const entry of await readdir(staging)) {
          if (entry === '_artifacts') continue;
          await rename(path.join(staging, entry), path.join(target, entry));
          moved.push(entry);
        }
      } catch (error) {
        for (const entry of moved) await rm(contained(target, path.join(target, entry)), { recursive: true, force: true });
        throw error;
      }
    }
    console.log(`Created apps/${name} from ${template}. Next: pnpm install`);
    return target;
  } finally {
    await rm(contained(apps, staging), { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) await cli(() => initProject(parseArgs(process.argv.slice(2), ['name', 'template', 'skills'])));
