import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cli, isMain, parseArgs, projectPath, readJson, safePath } from './lib/common.mjs';

const escapeXml = (value) => String(value).replace(/[&<>"']/g, (symbol) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[symbol]);

/** 先校验整份资产清单，再生成缺失的 SVG；返回新建数量，已有正式图永不覆盖。 */
export async function generateAssets(args) {
  const project = await projectPath(args);
  const manifest = await readJson(await safePath(project, args.manifest ?? 'assets.manifest.json'));
  if (manifest.version !== 1 || !Array.isArray(manifest.assets)) throw new Error('Expected version 1 assets manifest');
  const publicRoot = await safePath(project, 'public');
  const seenIds = new Set();
  const seenPaths = new Set();
  const outputs = [];
  // 一项非法即整体停止，避免前半清单已经写入、后半才发现越界。
  for (const asset of manifest.assets) {
    if (!asset || typeof asset.id !== 'string' || !asset.id || seenIds.has(asset.id)) throw new Error('Asset IDs must be unique non-empty strings');
    if (typeof asset.path !== 'string' || !/^assets\/[a-zA-Z0-9_./-]+\.svg$/.test(asset.path) || asset.path.split('/').some((segment) => ['', '.', '..'].includes(segment))) throw new Error(`Invalid relative SVG path: ${asset.path}`);
    if (seenPaths.has(asset.path.toLowerCase())) throw new Error(`Duplicate asset path: ${asset.path}`);
    if (![asset.width, asset.height].every((size) => Number.isInteger(size) && size > 0 && size <= 4096)) throw new Error(`Invalid dimensions: ${asset.id}`);
    if (!Array.isArray(asset.anchor) || asset.anchor.length !== 2 || !asset.anchor.every((value) => typeof value === 'number' && value >= 0 && value <= 1)) throw new Error(`Invalid anchor: ${asset.id}`);
    if (asset.color !== undefined && !/^#[0-9a-f]{6}$/i.test(asset.color)) throw new Error(`Invalid color: ${asset.id}`);
    const file = await safePath(publicRoot, asset.path);
    seenIds.add(asset.id); seenPaths.add(asset.path.toLowerCase());
    outputs.push({ asset, file });
  }
  let count = 0;
  for (const { asset, file } of outputs) {
    const { width, height } = asset;
    const label = escapeXml(asset.label ?? asset.id);
    const color = asset.color ?? '#b3dfff';
    const inset = Math.min(2, width / 4, height / 4);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${Math.min(width, height) * 0.2}" fill="${color}" stroke="#ffffff" stroke-width="${inset * 2}"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.26}" fill="#ffffff" fill-opacity=".22"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${Math.max(8, Math.min(width, height) / 9)}" fill="#203552">${label}</text></svg>\n`;
    await mkdir(path.dirname(file), { recursive: true });
    try {
      await writeFile(file, svg, { flag: 'wx' }); // 原子地只建新文件，保留已替换的正式美术。
      count += 1;
    } catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  console.log(`Generated ${count} placeholder SVGs (${outputs.length - count} existing assets preserved).`);
  return count;
}

if (isMain(import.meta.url)) await cli(() => generateAssets(parseArgs(process.argv.slice(2), ['app', 'project', 'manifest'])));
