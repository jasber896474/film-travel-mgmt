#!/usr/bin/env bash
# One-time: log in jasber896474 and switch gh/git to that account for pushes to origin.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! gh auth status --hostname github.com 2>&1 | grep -q 'jasber896474'; then
  echo "尚未登入 jasber896474。瀏覽器會開啟，請用 jasber896474 帳號完成授權。"
  gh auth login --hostname github.com --git-protocol https --web --skip-ssh-key
fi

gh auth switch --hostname github.com --user jasber896474
echo ""
gh auth status
echo ""
echo "此 repo 的 git push 會使用上方 Active 帳號（已設定 gh git-credential）。"
echo "推正式站：git push origin main"
