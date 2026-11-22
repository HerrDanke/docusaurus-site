# ObsidiaNote · Docusaurus 知识库站

Obsidian 知识库（ObsidiaNote）的 **Docusaurus 正式站**（8081）。2026-08-11 由 Docsify 切换而来（此前为 8084 并行试点），**vault 完全只读、零拷贝、零改动**，vault 内不再含任何站点文件。

## 架构概览

```
Obsidian vault（HerrDanke/ObsidiaNote）          ← 内容真相源（只读）
├── Tech/  Assets/                               ← 由两个 plugin-content-docs 实例直接读取（path 指向外部目录）
      │  每 5 分钟 docusaurus-deploy.timer（复用 /run/vault-deploy.lock）
      ▼
本仓库（Docusaurus）                              ← 站点代码
├── docusaurus.config.js                         ← 双 docs 实例 + landing 插件 + 中文搜索
├── src/components/LandingPage.jsx               ← 分区落地页（/Tech、/Assets）
└── build/                                       ← 构建产物（gitignored）
      │  npm run build（Docusaurus 静态生成）
      ▼
build/ → nginx 8081
```

**核心原则**：内容与代码分离。vault 是唯一真相源，站点只通过 `path` 读取内容；本仓库只存站点代码，不复制、不修改 vault 任何文件。

## 关键设计

- **双 docs 实例直读 vault**：`id: 'tech'` → `vault/Tech`、`id: 'assets'` → `vault/Assets`，`routeBasePath` 保持原 Docsify 的 URL 形态（`/Tech/...`、`/Assets/...`）。
- **`markdown: { format: 'md' }`**：纯 markdown 渲染（非 MDX），vault 笔记中的裸 HTML 标签可直接渲染，避免 MDX 报错。
- **landing 插件（SSG 落地页）**：vault 的 Tech/、Assets/ 根目录没有 index.md，且 vault 只读不能新增。自定义 `landingPlugin` 在构建期把分区顶层分类算成卡片数据，注入为 `/Tech`、`/Assets` 的 **exact 叶子路由**——因此落地页会被 SSG 成静态 HTML，直链无需应用壳，也没有空壳带来的 hydration mismatch。
- **`@easyops-cn/docusaurus-search-local`**：本地中文分词全文搜索（jieba），索引 `/Tech`、`/Assets`。
- **应用壳与尾斜杠**：nginx 对 `/Tech/`、`/Assets/` 301 归一化到无斜杠版本，其余路径回退 404.html。

## 快速开始

```bash
# 安装依赖
npm install

# 构建（读 vault，无需联网拉取内容）
npm run build

# 本地预览构建产物
npm run serve
```

## 部署

- 部署脚本：本仓库 [`deploy/docusaurus-deploy.sh`](./deploy/docusaurus-deploy.sh) 纳管（`/usr/local/sbin/docusaurus-deploy.sh` 是指向它的软链）：`git fetch → ff-only merge`（vault + 本仓库）→ `npm ci && npm run build` → 校验产物。
- systemd `docusaurus-deploy.timer`：每 5 分钟触发，与 ai-assets-site 部署共享 `/run/vault-deploy.lock` 串行化 git 操作；以 vault HEAD 状态文件做增量，内容无更新时跳过构建。（原 Docsify 的 `obsidia-deploy.timer` 已于切换时退役。）

### systemd 单元配置说明

`docusaurus-deploy.service` 是 `Type=oneshot` 的一次性构建任务（**不是常驻服务**），由 timer 驱动。以下几点容易踩坑，记录备查：

| 配置 | 作用 | 注意 |
|---|---|---|
| `Restart=on-failure` + `RestartSec=60s` | 构建失败（非 0 退出）60 秒后重试 | oneshot 成功后即结束，**不会**被反复拉起；只有失败才重试 |
| `TimeoutStartSec=1800` | 单次构建最长 30 分钟 | 超时按失败处理并触发重试 |
| `StartLimitIntervalSec=1800` + `StartLimitBurst=3` | 30 分钟内失败 3 次即锁定 | **必须写在 `[Unit]`，不是 `[Service]`**；写在 `[Service]` 会被 systemd 静默忽略，限流失效且不报错 |
| `OnBootSec=2min`（timer） | 开机后 2 分钟补一次构建 | 状态文件在 `/run/docusaurus-deployed.sha`，重启后丢失，**开机首次必做全量构建**（`npm ci` + `build`） |
| `Persistent=true`（timer） | 关机期间错过的触发会在开机后补跑 | 与 `OnBootSec` 配合，保证开机即同步 |

**开机自启**由 `systemctl enable docusaurus-deploy.timer` 承担（service 本身是 `static`，不需要 enable）。

失败锁定后需人工介入恢复：

```bash
systemctl status docusaurus-deploy.service     # 查看失败原因
systemctl reset-failed docusaurus-deploy.service
```

> 限流是刻意设计：若 vault 出现 git 分叉或 `npm ci` 网络失败，无限重试只会每 5 分钟刷日志、空耗 CPU。脚本日志会明确提示「可能分叉，请手动处理」。

## 评估结论

迁移可行性评估详见 [`EVALUATION.md`](./EVALUATION.md)。

## 已知行为差异

- 个别 vault 内相对 markdown 链接（`./xxx.md`）Docusaurus 无法解析（原 Docsify 时代能），构建期告警，不影响渲染。
- `Assets/catalog` 分类标题取自 vault 内 `catalog/README.md` 的 H1，忠实于内容。

## 清单类页面的宽表格版式（2026-11-22）

`/starred/*` 下的页面（标星清单、本机软件清单）是 markdown 生成的大表格，Docusaurus 默认
`.markdown table { display:block; overflow:auto }` 会把列宽压到 min-content，导致「下载 · 官网」
两个链接各自折行、整张表被拉成竖条。处理方式：

- **`src/theme/DocItem/Content/index.js`**（`npx docusaurus swizzle @docusaurus/theme-classic DocItem/Content --eject --danger --javascript` 生成后改一处）：
  按 `metadata.permalink` 前缀 `/starred/` 给正文容器追加 `doc-wide-page`。
  > 两个踩过的坑：① `metadata` 在运行时**没有 `pluginId` 字段**，判断实例只能靠 permalink；
  > ② 不要在 Layout 层用 DOM 副作用加 class——React 水合会重建 article 内容，class 与任何
  > wrapper 都会丢（还容易引出 hydration mismatch）。class 直接写在渲染 `.theme-doc-markdown`
  > 的那个组件的 JSX 上最稳。
- **`src/css/custom.css`** 的 `.doc-wide-page` 段：
  - `table { display:table; table-layout:fixed; width:100% }` —— 列宽由 `th` 宽度决定，不被超长文本撑开；
  - 列宽**按列数用 `:has()` 区分**，不能用 `nth-child` 盲设：标星表 3 列（仓库|描述|⭐）、
    软件清单表 5 列（软件|版本|来源|官方链接|说明）。曾把 `nth-child(2)` 设成 `nowrap`，
    结果标星表的「描述」列拒绝换行、整表 2199px，页面被撑到 2515px 要横向拖；
  - 5 列表用 rem 固定前四列（软件名 15rem / 版本 7.5rem / 来源 7.5rem / 链接 8.5rem），
    用百分比会裁掉长软件名（`Windows Subsystem for Linux`）；说明列 `width:auto` 吃剩余；
  - `@media (max-width:996px)` 下 `table { display:block; overflow-x:auto }`，
    窄屏只在表格内部横向滚动，整页不出横向滚动条。

自检（浏览器控制台，两条都应为 false / 0）：

```js
document.documentElement.scrollWidth > document.documentElement.clientWidth   // 整页横向溢出
[...document.querySelectorAll('article tbody td')].filter(td => td.scrollWidth > td.clientWidth + 1).length  // 被裁单元格
```

改完必须 `rm -rf build .docusaurus && npm run build`：chunk 文件名固定为 `17896441.<hash>`，
增量构建时浏览器可能命中旧 chunk（曾因此误判「改动没生效」）。
