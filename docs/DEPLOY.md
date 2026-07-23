# 部署與 Push 流程

正式網站（GitHub Pages）：**https://jasber896474.github.io/film-travel-mgmt/**

## Remote 設定

| 名稱 | 仓库 | 用途 |
|------|------|------|
| `origin` | `jasber896474/film-travel-mgmt` | **正式站**，push 到這裡才會更新 Pages |
| `fork` | `jinfonentertainment/film-travel-mgmt` | 備用 fork，需 PR 合併才會進正式站 |

## 日常更新（推薦）

在專案目錄 `film-travel-mgmt` 內：

```bash
cd ~/Documents/GitHub/film-travel-mgmt

# 1. 改完 App.jsx 後同步 index.html
node scripts/sync-index.mjs

# 2. 提交
git add App.jsx index.html
git commit -m "feat: 你的說明"

# 3. 推到正式站 main
git push origin HEAD:main
```

## GitHub Desktop 注意

1. 左上角請選 **film-travel-mgmt**，不要選到使用者主目錄或其他專案。
2. 若出現 **You don't have write access**，表示目前登入的 GitHub 帳號無法 push 到該 remote；更新正式站需使用 **jasber896474** 帳號（或已授權的 credential）。
3. 若 commit 失敗並出現 `Adobe Illustrator … Permission denied`，通常是 **誤把 ~/ 當成 Git 仓库**；請確認不是在 Home 目錄操作。

## 分支說明

- `main`：追蹤 `origin/main`（正式站）
- 功能分支完成後：`git push origin 你的分支:main` 或先 merge 到本地 main 再 push
