import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { cli, exists, isMain, parseArgs, projectPath, safePath, walk } from './lib/common.mjs';

const DEFAULT_JS = 1.5 * 1024 * 1024;
const DEFAULT_TOTAL = 10 * 1024 * 1024;
const isCode = (file) => /\.[cm]?[jt]sx?$/.test(file);
const enginePattern = /^(?:pixi(?:\.js)?|@pixi\/|phaser|three(?:\/|$)|matter-js)/i;
const domGlobals = new Set(['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'AudioContext', 'HTMLElement', 'HTMLCanvasElement', 'requestAnimationFrame', 'cancelAnimationFrame', 'Image', 'fetch', 'globalThis', 'self']);

function parse(file, source) {
  const kind = /\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.jsx$/.test(file) ? ts.ScriptKind.JSX : /\.[cm]?js$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
}
function visit(root, callback) { callback(root); ts.forEachChild(root, (node) => visit(node, callback)); }
function lineAt(tree, node) { return tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1; }

/**
 * 审计已构建项目的源码边界、相对 URL、生产调试残留与原始文件字节预算。
 * 输出 JSON；有违规时抛错令 CLI 非零退出。静态结果不等同于真机性能保证。
 */
export async function auditProject(args) {
  const project = await projectPath(args);
  const src = await safePath(project, 'src');
  const dist = await safePath(project, 'dist');
  if (!await exists(src) || !await exists(path.join(dist, 'index.html'))) throw new Error('Expected src/ and built dist/index.html; run build first');
  const maxJs = Number(args['max-js-bytes'] ?? DEFAULT_JS);
  const maxTotal = Number(args['max-total-bytes'] ?? DEFAULT_TOTAL);
  if (![maxJs, maxTotal].every((budget) => Number.isFinite(budget) && budget > 0)) throw new Error('Budgets must be positive byte counts');
  const violations = new Set();
  const sources = new Map();
  const sourceFiles = (await walk(src)).filter(isCode);
  for (const file of sourceFiles) sources.set(file, parse(file, await readFile(file, 'utf8')));
  const report = (file, tree, node, message) => violations.add(`${path.relative(project, file)}:${lineAt(tree, node)} ${message}`);
  for (const [file, tree] of sources) {
    if (/@ts-ignore\b/.test(tree.text)) violations.add(`${path.relative(project, file)} Forbidden @ts-ignore`);
    visit(tree, (node) => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) report(file, tree, node, 'Forbidden TypeScript any');
      if ((ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text.startsWith('/')) {
        report(file, tree, node, `Absolute URL/module path: ${node.text.slice(0, 100)}`);
      }
      if (ts.isTemplateExpression(node) && node.head.text.startsWith('/')) report(file, tree, node, 'Absolute templated URL');
    });
  }
  // 递归检查 state 的本地依赖，避免通过 helper 间接引入 DOM 或渲染引擎。
  const inspected = new Set();
  const inspectState = async (file) => {
    if (inspected.has(file)) return;
    inspected.add(file);
    const tree = sources.get(file);
    if (!tree) return;
    const localImports = [];
    visit(tree, (node) => {
      if (ts.isIdentifier(node) && domGlobals.has(node.text)) report(file, tree, node, `State dependency references DOM/browser API ${node.text}`);
      if (ts.isStringLiteralLike(node) && enginePattern.test(node.text)) report(file, tree, node, `State dependency imports engine ${node.text}`);
      if (ts.isIdentifier(node) && ['AudioManager', 'StorageManager'].includes(node.text)) report(file, tree, node, `State dependency references browser service ${node.text}`);
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) localImports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteralLike(argument)) localImports.push(argument.text);
        else report(file, tree, node, 'Dynamic imports in state must use a static module name');
      }
    });
    for (const specifier of localImports.filter((value) => value.startsWith('.'))) {
      const base = path.resolve(path.dirname(file), specifier);
      const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), base.replace(/\.js$/, '.ts')];
      const resolved = candidates.find((candidate) => sources.has(candidate));
      if (resolved) await inspectState(resolved);
      else if (!/\.json$/.test(specifier)) violations.add(`${path.relative(project, file)} Unresolved/out-of-src state dependency: ${specifier}`);
    }
  };
  for (const file of sourceFiles.filter((file) => path.relative(src, file).split(path.sep).join('/').startsWith('gameplay/state/'))) await inspectState(file);
  const config = await safePath(project, 'vite.config.ts');
  const configTree = parse(config, await readFile(config, 'utf8'));
  let relativeBase = false;
  visit(configTree, (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(configTree).replace(/['"]/g, '') === 'base' && ts.isStringLiteralLike(node.initializer) && node.initializer.text === './') relativeBase = true;
  });
  if (!relativeBase) violations.add("vite.config.ts must declare base: './'");
  let jsBytes = 0;
  let totalBytes = 0;
  const distFiles = await walk(dist, []);
  for (const file of distFiles) {
    const { size } = await stat(file);
    totalBytes += size;
    if (/\.[cm]?js$/.test(file)) jsBytes += size;
    if (!/\.(?:[cm]?js|html|css|json|svg)$/.test(file)) continue;
    const content = await readFile(file, 'utf8');
    const name = path.relative(project, file);
    if (/\.[cm]?js$/.test(file) && content.includes('__GAME_TEST__')) violations.add(`${name} Production TestBridge was not stripped`);
    if (/\.(html|svg)$/.test(file) && /(?:src|href|poster|srcset)\s*=\s*["']\s*\//i.test(content)) violations.add(`${name} Absolute resource attribute`);
    if (/url\(\s*["']?\//i.test(content)) violations.add(`${name} Absolute CSS resource URL`);
    if (/\.[cm]?js$/.test(file) && /["'`]\/(?:assets|images|audio|fonts)\//.test(content)) violations.add(`${name} Absolute bundled resource URL`);
    if (/\.json$/.test(file) && /"(?:path|src|url)"\s*:\s*"\//.test(content)) violations.add(`${name} Absolute manifest resource URL`);
  }
  // public 文件不会被 Vite 改写，必须连同未打包的 HTML/CSS/清单单独检查。
  const extraFiles = [path.join(project, 'index.html'), ...await walk(src)];
  const publicRoot = await safePath(project, 'public');
  if (await exists(publicRoot)) extraFiles.push(...await walk(publicRoot, []));
  if (await exists(path.join(project, 'assets.manifest.json'))) extraFiles.push(path.join(project, 'assets.manifest.json'));
  for (const file of extraFiles) {
    if (!/\.(?:html|css|svg|json)$/.test(file)) continue;
    const content = await readFile(file, 'utf8');
    if (/(?:src|href|poster|srcset)\s*=\s*["']\s*\/|url\(\s*["']?\/|"(?:path|src|url)"\s*:\s*"\//i.test(content)) violations.add(`${path.relative(project, file)} Absolute resource URL`);
  }
  if (jsBytes > maxJs) violations.add(`JavaScript budget exceeded: ${jsBytes} > ${maxJs}`);
  if (totalBytes > maxTotal) violations.add(`Total resource budget exceeded: ${totalBytes} > ${maxTotal}`);
  const result = { project: path.relative(path.dirname(project), project), jsBytes, totalBytes, maxJs, maxTotal, files: distFiles.length, violations: [...violations] };
  console.log(JSON.stringify(result, null, 2));
  if (violations.size) throw new Error(`Performance/source audit failed (${violations.size} violations)`);
  return result;
}

if (isMain(import.meta.url)) await cli(() => auditProject(parseArgs(process.argv.slice(2), ['app', 'project', 'max-js-bytes', 'max-total-bytes'])));
