# 即時競賽排行榜

分組競賽即時積分排行榜，資料來源為 Google Sheets，每 30 秒自動更新。

## 設定說明

### 1. 建立 Google Sheets

第一列欄位名稱（請完全照這個寫）：

| team_id | team_name | color_index | label | points | note |
|---------|-----------|-------------|-------|--------|------|
| 1 | 火焰鳳凰隊 | 0 | 第一關卡 | 85 | 快速完成獎勵 |
| 1 | 火焰鳳凰隊 | 0 | 團隊協作 | 92 | 評審加分 |
| 2 | 蒼穹雷霆隊 | 1 | 第一關卡 | 90 | 最高分 |

- **team_id**：每隊一個數字（建議 1–6）
- **team_name**：隊伍名稱
- **color_index**：顏色編號 0=橘 1=藍 2=紫 3=綠 4=黃 5=粉
- **label**：積分項目名稱
- **points**：該項目分數
- **note**：備註（可空白）

### 2. 發布 Google Sheets 為 CSV

1. 開啟試算表 → 上方選單「檔案」
2. 選「共用」→「發布到網路」
3. 左邊選「整份文件」，右邊選「逗號分隔值 (.csv)」
4. 按「發布」→ 複製產生的網址

### 3. 填入網址

開啟 `src/App.jsx`，找到第 10 行：

```js
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?output=csv";
```

把整段網址替換成你剛複製的 CSV 網址。

## 部署到 Vercel

1. 上傳此資料夾到 GitHub（見下方說明）
2. 前往 [vercel.com](https://vercel.com) → 用 GitHub 登入
3. 點「Add New Project」→ 選你的 repo
4. Framework 選 **Vite** → 按 Deploy
5. 幾分鐘後取得免費網址，例如：`my-ranking.vercel.app`

## 顏色對照

| color_index | 顏色 |
|-------------|------|
| 0 | 橘色 🟠 |
| 1 | 藍色 🔵 |
| 2 | 紫色 🟣 |
| 3 | 綠色 🟢 |
| 4 | 黃色 🟡 |
| 5 | 粉色 🩷 |
