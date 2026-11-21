import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, appPath, contained, exists } from '../lib/common.mjs';
import { initProject } from '../init-project.mjs';
import { generateAssets } from '../gen-placeholder-assets.mjs';
import { auditProject } from '../audit-perf.mjs';

const names = [];
let sequence = 0;
async function fixture() {
  const name = `_tools-${process.pid}-${sequence++}`;
  names.push(name);
  const directory = await appPath(name);
  await mkdir(directory, { recursive: true });
  return { name, directory };
}
after(async () => {
  for (const name of names) {
    const directory = await appPath(name);
    await rm(contained(path.join(ROOT, 'apps'), directory), { recursive: true, force: true });
  }
});

test('scaffold preserves approved artifacts, changes package name and skips caches', async () => {
  const { name, directory } = await fixture();
  await mkdir(path.join(directory, '_artifacts'));
  await writeFile(path.join(directory, '_artifacts', '01_GDD.md'), '# approved');
  await initProject({ name, skills: 'puzzle,roguelike' });
  assert.equal(JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8')).name, `@factory/${name}`);
  assert.equal(await readFile(path.join(directory, '_artifacts', '01_GDD.md'), 'utf8'), '# approved');
  assert.match(await readFile(path.join(directory, 'AGENTS.md'), 'utf8'), /\.\.\/\.\.\/skills\/genres\/puzzle\.md/);
  assert.equal(await exists(path.join(directory, 'node_modules')), false);
  assert.equal(await exists(path.join(directory, 'dist')), false);
  await assert.rejects(initProject({ name }), /refusing to overwrite/);
  await assert.rejects(initProject({ name: '../escape' }), /slug/);
  await assert.rejects(initProject({ name: '_unused', skills: '../escape' }), /Unknown genre/);
  await assert.rejects(initProject({ name: '_unused', template: 'threejs-ts' }), /Only/);
});

test('scaffold creates artifacts even if the destination was an empty directory', async () => {
  const { name, directory } = await fixture();
  await initProject({ name });
  assert.equal(await exists(path.join(directory, '_artifacts')), true);
});

test('asset generator honors dimensions, escapes XML, preserves replacements and rejects traversal', async () => {
  const { name, directory } = await fixture();
  const asset = { id: 'orb', path: 'assets/orb.svg', width: 80, height: 120, anchor: [0.5, 0.5], label: '<safe & sound>' };
  const save = (assets) => writeFile(path.join(directory, 'assets.manifest.json'), JSON.stringify({ version: 1, assets }));
  await save([asset]);
  assert.equal(await generateAssets({ app: name }), 1);
  const svgFile = path.join(directory, 'public', 'assets', 'orb.svg');
  const svg = await readFile(svgFile, 'utf8');
  assert.match(svg, /width="80" height="120"/);
  assert.match(svg, /&lt;safe &amp; sound&gt;/);
  await writeFile(svgFile, 'production-art');
  assert.equal(await generateAssets({ app: name }), 0);
  assert.equal(await readFile(svgFile, 'utf8'), 'production-art');
  await save([{ ...asset, path: 'assets/../../escape.svg' }]);
  await assert.rejects(generateAssets({ app: name }), /Invalid relative/);
  await save([{ ...asset, path: 'assets/./orb.svg' }]);
  await assert.rejects(generateAssets({ app: name }), /Invalid relative/);
  await save([asset, { ...asset, id: 'other' }]);
  await assert.rejects(generateAssets({ app: name }), /Duplicate asset path/);
  await save([{ ...asset, width: 0 }]);
  await assert.rejects(generateAssets({ app: name }), /dimensions/);
  assert.deepEqual(await readdir(path.join(directory, 'public', 'assets')), ['orb.svg']);
});

test('audit fails on transitive state violations, absolute paths, debug residue and byte budgets', async () => {
  const { name, directory } = await fixture();
  const state = path.join(directory, 'src', 'gameplay', 'state');
  await mkdir(state, { recursive: true });
  await mkdir(path.join(directory, 'dist'));
  await writeFile(path.join(directory, 'vite.config.ts'), "export default { base: './' };");
  await writeFile(path.join(directory, 'index.html'), '<script src="./src/main.ts"></script>');
  await writeFile(path.join(directory, 'dist', 'index.html'), '<script src="./main.js"></script>');
  await writeFile(path.join(directory, 'dist', 'main.js'), 'console.log("ok")');
  await writeFile(path.join(state, 'logic.ts'), 'export const score: number = 0;');
  const result = await auditProject({ app: name });
  assert.equal(result.violations.length, 0);
  await writeFile(path.join(state, 'logic.ts'), "export { value } from '../../helper';");
  await writeFile(path.join(directory, 'src', 'helper.ts'), "import { Sprite } from 'pixi.js'; export const value = document.title;");
  await assert.rejects(auditProject({ app: name }), /audit failed/);
  await rm(path.join(directory, 'src', 'helper.ts'));
  await writeFile(path.join(state, 'logic.ts'), 'export const bad: any = "/assets/orb.svg";');
  await assert.rejects(auditProject({ app: name }), /audit failed/);
  await writeFile(path.join(state, 'logic.ts'), 'export const score = 0;');
  await writeFile(path.join(directory, 'dist', 'main.js'), 'window.__GAME_TEST__ = {};');
  await assert.rejects(auditProject({ app: name }), /audit failed/);
  await writeFile(path.join(directory, 'dist', 'main.js'), 'console.log("ok")');
  await assert.rejects(auditProject({ app: name, 'max-js-bytes': '1' }), /audit failed/);
  await assert.rejects(auditProject({ app: name, 'max-total-bytes': '1' }), /audit failed/);
});
