# 勘景資料系統（暫掛在 film-travel-mgmt）

獨立工具，只共用這個 repo 的 Vercel 名額。差旅系統的 `App.jsx` 沒有改。

## 怎麼用

- 同事：打開你給的連結即可，例如  
  `https://film-travel-mgmt.vercel.app/scouting/p/xxxxx`  
  知道連結就能編，看不到其他劇。
- 你自己開新劇：  
  `https://film-travel-mgmt.vercel.app/scouting/new`  
  輸入開專案密鑰與劇名，複製連結丟給該組。

## 目前進度

- 文字建檔（分類／場景／自動存檔）已可在本機使用
- pCloud App `scouting-report` 還在 pending，照片上傳要等批准
- 上線（Vercel）還沒填環境變數、也還沒 push

## 本機

```bash
npm install
npm run dev
```

- 開新劇：http://localhost:5173/scouting/new
- 測試劇：http://localhost:5173/scouting/p/S3hNVd-iFOlm

## Vercel 環境變數

在 **film-travel-mgmt** 這個 Vercel 專案填：

| 變數 | 說明 |
|---|---|
| `SCOUTING_SUPABASE_SERVICE_ROLE_KEY` | 差旅那個 Supabase 專案的 service_role（只放伺服器，不要進前端） |
| `SCOUTING_ADMIN_KEY` | 只有你知道的開專案密鑰 |
| `SCOUTING_SUPABASE_URL` | 可省略，預設已是差旅專案網址 |
| `PCLOUD_ACCESS_TOKEN` | pCloud token |
| `PCLOUD_PUBLIC_FOLDER_ID` | Public Folder 的 folderid |
| `PCLOUD_FILEDN_BASE` | 例如 `https://filedn.com/xxxx`（在 pCloud Public Folder 按「複製連結」） |
| `PCLOUD_HOST` | 歐洲帳號用 `eapi.pcloud.com`，美國用 `api.pcloud.com` |

沒設 pCloud 時，分類與場景文字仍可同步；上傳照片會提示尚未設定。

## 為什麼資料庫跟差旅同一個

Supabase 免費帳也是兩個專案上限。勘景表名都是 `scouting_*`，且撤掉 anon 權限，差旅前端的公開金鑰讀不到這些表。
