# Docsify → Docusaurus 可行性评估报告

> 日期：2026-08-11 · 并行试点站（8084）已上线，vault 零改动、只读
> 预览地址：`http://localhost:8084/`（或 `IP:8084`），8081 Docsify 保持不变

## 结论

**可行，且对当前 vault 架构友好。** Docusaurus 3.10.2 已能完整承载 Tech + Assets 两个分区，
URL 形态与 Docsify 一致（`/Tech/...`、`/Assets/...`），中文搜索、移动端导航开箱即用。
试点站所有功能验证通过，是否切换由你决策（见文末）。

## 架构（并行试点，未影响现状）

```
vault (/root/webhost/vault)          ← 真相源，零改动、只读
├── Tech/  Assets/                   ← Docusaurus 双 docs 实例 path 直读
├── index.html  scripts/             ← Docsify 保留，8081 照常跑

Docusaurus 站 (/root/webhost/Docusaurus/)
├── docusaurus.config.js             ← 双 docs 实例(path→vault) + 搜索 + 主题
├── src/theme/DocsRoot/              ← 分区落地页（vault 无 index.md 的替代方案）
└── build/                           ← 构建产物

nginx 8084 → build/（SPA fallback）
systemd docusaurus-deploy.timer      ← 每 5 分钟，复用 vault-deploy.lock
```

## 关键实现与踩坑

| 问题 | 处理 |
|---|---|
| 4 个 Assets 文件含裸 HTML，MDX 当 JSX 报错 | 顶层 `markdown: { format: 'md' }` 全局纯 markdown 渲染（构建层，不动 vault） |
| vault Tech/Assets 根无 index.md，`/Tech/` 404 | 自定义 `src/theme/DocsRoot`：分区根渲染分类卡片落地页，其他路径委托子路由渲染文档 |
| 双 docs 实例无 `default`，navbar 报错 | navbar 项加 `docsPluginId`；搜索插件加 `docsPluginIdForPreferredVersion` 兜底 |
| 搜索默认只索引 `/docs` | `docsRouteBasePath: ['Tech','Assets']` + `docsDir` 指向 vault |
| 分区根无静态文件（Docusaurus 只 SSG 叶子路由） | nginx 正则 location 精确回退应用壳；首页指向分区根时构建期有 `onBrokenLinks` 警告（无害） |
| vault 内 4 处 `./xxx.md` 相对链接解析不了 | `onBrokenMarkdownLinks: 'warn'`，不影响渲染，迁移时可顺手修 |
| 部署与 git 并发 | 复用 `/run/vault-deploy.lock` flock；以"上次构建时 vault HEAD"状态文件判断增量 |

## 验证结果

| 项 | 结果 |
|---|---|
| 预览站存活 | 8084/ = 200，标题 ObsidiaNote ✓ |
| 内容完整性 | `_sidebar.md` 182 条站内链接逐一对 8084 全 200 ✓ |
| slug 冲突（SKILL.md×55 等） | 构建无 duplicate routes 警告 ✓ |
| 移动端 375×667 | 汉堡开导航、可滚、无横向溢出 ✓ |
| 中文搜索 | "PVE"、"量化" 均命中（jieba 分词） ✓ |
| 与 Docsify 对比 | 同篇"安装PVE系统"两站均正常渲染，加载相当 ✓ |
| 部署链路 | fetch→merge→npm ci→build 全通，增量跳过验证 ✓ |
| git 并发 | 三 service 并发触发无 lock/index.lock 错误 ✓ |

## Docsify vs Docusaurus（试点实测）

| 维度 | Docsify（8081） | Docusaurus（8084） |
|---|---|---|
| 部署 | 零构建，git pull 即发布 | pull + `npm ci`+build（每次构建约 1m45s） |
| 移动端 | 侧边栏多次手写 CSS/JS 修补 | 原生响应式 navbar，开箱即用 |
| 搜索 | 弱（标题匹配） | 中文分词全文搜索，命中率高 |
| SEO | SPA 客户端渲染 | SSG 预渲染 + sitemap |
| 文档导航 | 无面包屑/目录 | 面包屑、右侧 TOC、上一页/下一页 |
| 主题 | 手写 Apple CSS | 内置亮/暗主题、代码高亮 |
| tags | 无 | Assets 自带标签体系自动生成标签页（490 个，可关） |
| 内容源 | 直接 serve vault md | 构建时读 vault（外部 path） |

## 决策点

- **切换 Docusaurus**：把 8081 的 nginx root 指向 `/root/webhost/Docusaurus/build`（或换 URL），
  退役 Docsify 线上角色（vault 里 Docsify 文件可留作历史）。切换前建议把 `docusaurus.config.js` 的
  `url` 从 `http://localhost` 改为正式域名，并处理 4 处 vault 内相对链接。
- **维持 Docsify**：`systemctl disable --now docusaurus-deploy.timer` + 删 8084 server block 即可，
  vault 无任何改动。

无论哪个方向，**都不修改 vault 内容**，只动站点与 nginx，风险低。
