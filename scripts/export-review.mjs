import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, cli, isMain, walk } from './lib/common.mjs';

const excluded = new Set(['node_modules', 'dist', '.git', 'playwright-report', 'test-results', 'review.txt', '_artifacts']);
async function tree(directory, prefix = '') {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => !excluded.has(entry.name)).sort((a, b) => a.name.localeCompare(b.name));
  let output = '';
  for (const [index, entry] of entries.entries()) {
    const last = index === entries.length - 1;
    output += `${prefix}${last ? '└── ' : '├── '}${entry.name}${entry.isDirectory() ? '/' : ''}\n`;
    if (entry.isDirectory()) output += await tree(path.join(directory, entry.name), `${prefix}${last ? '    ' : '│   '}`);
  }
  return output;
}
/** 合并总控协议、阶段/skill 文档和目录树，生成不纳入 Git 的 review.txt。 */
export async function exportReview() {
  const documents = ['AGENTS.md', ...(await walk(path.join(ROOT, 'pipeline'))).filter((file) => file.endsWith('.md')).map((file) => path.relative(ROOT, file)), ...(await walk(path.join(ROOT, 'skills'))).filter((file) => file.endsWith('.md')).map((file) => path.relative(ROOT, file))];
  let output = `codex-game-factory · 人工审核包\n生成时间：${new Date().toISOString()}\n\n===== 核心目录树（排除依赖、构建产物和截图）=====\n${await tree(ROOT)}\n`;
  for (const file of documents) output += `\n===== ${file.split(path.sep).join('/')} =====\n\n${await readFile(path.join(ROOT, file), 'utf8')}\n`;
  await writeFile(path.join(ROOT, 'review.txt'), output);
  console.log(`Exported review.txt (${documents.length} protocol/skill documents + repository tree).`);
}
if (isMain(import.meta.url)) await cli(exportReview);
