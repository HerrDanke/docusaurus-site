#!/usr/bin/env bash
# 部署 ObsidiaNote vault → Docusaurus 正式站 (8081)
# 每 5 分钟由 systemd timer 触发：git fetch → ff-only merge → npm ci + build
# 与 ai-assets-deploy 共享 /run/vault-deploy.lock，串行化对 vault 的 git 操作
set -euo pipefail

# 与 ai-assets-deploy.sh 共享锁，防 index.lock 冲突与混合快照读
exec 9>/run/vault-deploy.lock
flock 9

REPO=/root/webhost/vault
SITE=/root/webhost/Docusaurus
STATE=/run/docusaurus-deployed.sha

# 拉取 vault（内容源）
cd "$REPO"
git fetch origin master --quiet || { echo "[docusaurus] $(date '+%F %T') vault fetch 失败"; exit 1; }

vault_local=$(git rev-parse HEAD)
vault_remote=$(git rev-parse origin/master)
if [ "$vault_local" != "$vault_remote" ]; then
  echo "[docusaurus] $(date '+%F %T') vault $vault_local -> $vault_remote"
  git merge --ff-only origin/master || { echo "[docusaurus] $(date '+%F %T') vault merge 失败（可能分叉），请手动处理"; exit 1; }
fi

# 拉取 Docusaurus（站点代码）
cd "$SITE"
git fetch origin master --quiet || { echo "[docusaurus] $(date '+%F %T') site fetch 失败"; exit 1; }

site_local=$(git rev-parse HEAD)
site_remote=$(git rev-parse origin/master)
if [ "$site_local" != "$site_remote" ]; then
  echo "[docusaurus] $(date '+%F %T') site $site_local -> $site_remote"
  git merge --ff-only origin/master || { echo "[docusaurus] $(date '+%F %T') site merge 失败（可能分叉），请手动处理"; exit 1; }
fi

# 任一仓库有更新则构建。状态文件记录 "vault_sha:site_sha"
last_state=$(cat "$STATE" 2>/dev/null || echo none)
cur_state="${vault_remote}:${site_remote}"
if [ "$last_state" != "$cur_state" ]; then
  if ! npm ci --no-audit --no-fund >/tmp/docusaurus-npm.log 2>&1; then
    echo "[docusaurus] $(date '+%F %T') npm ci 失败，见 /tmp/docusaurus-npm.log"; exit 1; fi
  if ! npm run build >/tmp/docusaurus-build.log 2>&1; then
    echo "[docusaurus] $(date '+%F %T') build 失败，见 /tmp/docusaurus-build.log"; exit 1; fi
  [ -f "$SITE/build/index.html" ] || { echo "[docusaurus] $(date '+%F %T') build 产物缺失 build/index.html"; exit 1; }
  echo "$cur_state" > "$STATE"
  echo "[docusaurus] $(date '+%F %T') 构建完成 $cur_state"
else
  echo "[docusaurus] $(date '+%F %T') 无更新，跳过构建"
fi
echo "[docusaurus] $(date '+%F %T') 完成"
