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

- `/usr/local/sbin/docusaurus-deploy.sh`：`git fetch → ff-only merge`（vault）→ `npm ci && npm run build` → 校验产物。
- systemd `docusaurus-deploy.timer`：每 5 分钟触发，与 ai-assets-site 部署共享 `/run/vault-deploy.lock` 串行化 git 操作；以 vault HEAD 状态文件做增量，内容无更新时跳过构建。（原 Docsify 的 `obsidia-deploy.timer` 已于切换时退役。）

## 评估结论

迁移可行性评估详见 [`EVALUATION.md`](./EVALUATION.md)。

## 已知行为差异

- 个别 vault 内相对 markdown 链接（`./xxx.md`）Docusaurus 无法解析（原 Docsify 时代能），构建期告警，不影响渲染。
- `Assets/catalog` 分类标题取自 vault 内 `catalog/README.md` 的 H1，忠实于内容。
