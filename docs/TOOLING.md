# 自动化工具与排错手册

官方网站：[ROSGames](https://www.rosgames.com/) · [返回 README](../README.md)

## 调用约定

以下命令均在仓库根运行，维护脚本均为 Node ESM `.mjs`。参数使用 `--key value` 形式；不支持短参数、`--key=value` 或重复参数，未知参数会报错。成功退出码为 0，失败为非零；尚无通用 `--help`，请以本手册为参数参考。

`slug` 为最长 64 位的小写名称，首位是字母或 `_`，其余可含数字、`_`、`-`。路径必须位于工作区的预期子目录；脚本拒绝越界和符号链接路径，避免误写其他目录。

## init-project.mjs · 建项

```text
node scripts/init-project.mjs --name star-demo --template pixi-ts --skills puzzle,roguelike
pnpm install
```

| 参数 | 默认/要求 |
| --- | --- |
| `--name` | 必填，目标为 `apps/<slug>`，包名为 `@factory/<slug>` |
| `--template` | 默认 pixi-ts，目前只有此模板已实现 |
| `--skills` | 可省略；支持 puzzle、roguelike，以逗号分隔 |

复制时跳过 node_modules、dist、截图/报告工件和旧局部 AGENTS；新局部 AGENTS 指向根规范库。先写暂存目录再迁入；已有目标仅允许为空或仅含 `_artifacts/`，已有工件原地保留。有源文件的项目一律拒绝覆盖。

报“Project already exists”时，使用新 slug，或人工确认目录的真实用途后处理；不要为重试而盲目清空已有游戏。建项后必须再 `pnpm install` 以加入 workspace 链接。

## gen-placeholder-assets.mjs · 生成占位图

```text
node scripts/gen-placeholder-assets.mjs --app star-demo
node scripts/gen-placeholder-assets.mjs --project templates/pixi-ts
```

`--app` 与 `--project` 二选一；`--project` 用于相对仓库路径。`--manifest` 可指定相对项目路径的清单，默认 `assets.manifest.json`。

清单 version 必须为 1；assets 为数组，每项包含唯一 id、`assets/...svg` 相对路径、1–4096 的整数 width/height、两项 `[0,1]` 范围的 anchor，可选六位十六进制 color 与 label。路径不可含空段、`.`、`..`，不同大小写的相同文件路径视作重复。先校验整份清单，再创建 SVG；XML 标签文字会转义。

输出位于项目 `public/assets/`，只创建缺失文件。显示“0 generated”通常是已有占位图或正式美术被正确保留。需要改变尺寸时先人工处理对应旧占位文件；正式替换保持路径、格式、尺寸、锚点与透明边界，重新构建即可。

## audit-perf.mjs · 静态与体积审计

```text
pnpm --filter @factory/star-demo run build
node scripts/audit-perf.mjs --app star-demo --max-js-bytes 1572864 --max-total-bytes 10485760
```

支持 `--app` 或 `--project`。要求已存在 `src/`、`vite.config.ts` 和 `dist/index.html`；两个预算可省略，默认原始 JS 总量 1.5 MiB、全部 dist 文件 10 MiB，单位为字节而非 gzip 大小。

输出 JSON 字段：project、jsBytes、totalBytes、maxJs、maxTotal、files、violations。无违规才成功退出。检查源码绝对资源路径、显式宽泛类型/忽略类型指令、state 本地传递依赖中的浏览器/引擎引用、Vite 相对 base、产物资源 URL 和生产 TestBridge 残留。

报缺少 dist 时先 build；报体积超标时先核对真实资源与依赖，预算调整要有 TECH_ARCH 依据。工具测试里输出的故意违规 fixture 不等于实际模板审计失败。静态扫描无法完整理解任意动态拼接或外部包副作用，仍需代码审查与生产浏览器验证。

## deploy-static.mjs · 本地静态打包

```text
node scripts/deploy-static.mjs --app star-demo --platform web
```

`--app` 必填；`--platform` 默认 mock，可选 mock/web/gd/gm/poki。脚本注入 `NODE_ENV=production`、`VITE_PLATFORM`，通过本地 pnpm CLI 执行该项目 build，生成 `dist/release.json` 后对最终目录审计。

`release.json` 记录 app、platform、builtAt、adapter、sdkIntegrated、相对入口；当前 adapter 固定为 mock、sdkIntegrated 为 false。脚本只生成本地 `dist/`；上传 ROSGames、GitHub Pages 或其他服务器必须另行配置与执行。审计失败时，残留的 dist 应视为未验收产物。

## verify-static.mjs · 生产子路径验收

```text
pnpm --filter @factory/star-demo run test:production
node scripts/verify-static.mjs --project templates/pixi-ts
```

先构建并安装 Playwright Chromium。包内调用时根据当前目录定位项目；从根直接调用时用 `--app` 或 `--project`。服务器仅监听本机随机端口，在 `/factory-check/` 下托管真实 dist；自动检查启动、点击加分、无错误/404 与生产无 TestBridge，并保存 `_artifacts/_screenshots/production/subpath-hud.png`，结束后关闭浏览器与服务器。

此脚本针对母体示例的按钮和计分流程编写；创建了不同玩法后，须同步调整业务断言，不能把示例选择器当成所有游戏的通用验收器。

## 审核包与临时项目

`pnpm run review` 运行 `export-review.mjs`，输出根 `review.txt`，包含根 AGENTS、pipeline、skills 和排除依赖/构建/截图的目录树。审核包不跟踪到 Git；增改规范后可重新生成。

`node scripts/cleanup-smoke.mjs` 只清理固定的 `apps/_smoke-test`，且先核对包名和共享内核依赖。它不接受任意删除路径，也不用于清理正式游戏。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| workspace 依赖无法解析 | 在根目录 `pnpm install`，确认项目在 apps 下且名字合法 |
| Playwright 找不到浏览器 | 运行 `pnpm --filter @factory/template-pixi-ts exec playwright install chromium`；只需默认无头测试时可使用 `install --only-shell chromium` |
| 浏览器下载断开 | 检查代理/网络后重试官方安装命令，不绕过 TLS 验证 |
| 本地服务器端口 4173 被占用 | 停止冲突进程后再运行 E2E；配置使用 strictPort，不会悄悄换端口 |
| 子目录访问资源 404 | 核对 `base: './'`、清单相对路径，并执行 audit 与 test:production |
| 广告总是立即成功 | 默认 Mock 行为；不是实际广告播放或平台收益记录 |
| GitHub Pages URL 404 | 本仓库的源码备份不等于已配置 Pages；官网入口是 ROSGames 主站 |
| GitHub 仓库链接无法打开 | 核对 owner/name 和当前可见性；公开仓库通常无需登录，私有仓库要求有权限账号 |
