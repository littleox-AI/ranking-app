# 即時競賽排行榜

分組競賽即時積分排行榜，資料來源為 Google Sheets，每 30 秒自動更新。

## Google Sheets 欄位格式

> 第一列要放欄位名稱；每一列代表一支隊伍。

範例：

| team_id | team_name | color_index | champion_gift | 闖關A | 闖關B | 團隊合作 |
|---------|-----------|-------------|---------------|------:|------:|---------:|
| 1 | 火焰鳳凰隊 | 0 | Switch 禮品卡 | 85 | 92 | 88 |
| 2 | 蒼穹雷霆隊 | 1 |  | 90 | 80 | 78 |
| 3 | 星際衝鋒隊 | 2 |  | 0 | 76 |  |

### 固定欄位（必填）

- `team_id`：隊伍 ID
- `team_name`：隊伍名稱
- `color_index`：保留欄位（目前簡約版介面不依顏色顯示）

### 冠軍禮物欄位（可選）

- `champion_gift`：冠軍禮物名稱。
- 只要在任一列填入值即可，前端會抓到第一個非空白值顯示在「本次冠軍」旁邊。

### 活動欄位

- 除了固定欄位與 `champion_gift` 以外，其餘欄位都會視為活動分數。
- 分數為 `0` 或空白時，前端會顯示 `N/A`。

## 發布 Google Sheets 為 CSV

1. 開啟試算表 → 「檔案」
2. 選「共用」→「發布到網路」
3. 左邊選「整份文件」，右邊選「逗號分隔值 (.csv)」
4. 按「發布」→ 複製網址

## 填入網址

編輯 `src/App.jsx` 的 `SHEET_CSV_URL`：

```js
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/pub?output=csv";
```

## 本地開發

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build
```
