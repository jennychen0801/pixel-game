# Pixel Quiz Adventure 🎮

這是一個結合 **8-bit 街機像素風格 (Pixel Art)** 的闖關問答遊戲。
前端採用 React + Vite 構建，透過 Google Apps Script (GAS) 將 Google Sheets 作為輕量級的後端資料庫與題庫。

## 🌟 遊戲特色

- **復古 UI/UX**：自帶 CRT 掃描線、Press Start 2P 點陣字體與復古按鍵回饋。
- **隨機像素關主**：動態串接 100 種 DiceBear Pixel Art 頭像作為各關卡關主。
- **無伺服器架構**：完全依賴 Google Sheets 進行題庫管理與成績記錄。

---

## 🛠️ 1. 本地端安裝與啟動

請確認您的電腦已安裝 [Node.js](https://nodejs.org/)。

1. **進入專案目錄**
   ```bash
   cd c:\Workspace\Antigravity\pixel-game
   ```
2. **安裝依賴套件** (若有 PowerShell 執行權限問題，請加上 `cmd /c`)
   ```bash
   cmd /c npm install
   ```
3. **啟動開發伺服器**
   ```bash
   cmd /c npm run dev
   ```
4. **開啟瀏覽器**
   前往 `http://localhost:5173` 即可看到本地遊戲畫面。

---

## 📊 2. Google Sheets 題庫與計分板建置

1. 建立一個全新的 **[Google 試算表](https://sheets.google.com)**。
2. 建立兩個工作表 (Sheet)，請**精確命名**如下：
   - 第一個工作表命名為：`題目`
   - 第二個工作表命名為：`回答`
3. **設定「題目」工作表的欄位標題 (第一列 A-G)**：
   - A1: `id` (題號)
   - B1: `text` (題目內容)
   - C1: `A` (選項 A)
   - D1: `B` (選項 B)
   - E1: `C` (選項 C)
   - F1: `D` (選項 D)
   - G1: `ans` (正確解答，填入 A, B, C 或 D)
4. **設定「回答」工作表的欄位標題 (第一列 A-G)**：
   - A1: `ID` (玩家識別碼)
   - B1: `闖關次數`
   - C1: `總分` (歷史累計得分)
   - D1: `最高分`
   - E1: `第一次通關分數`
   - F1: `花了幾次通關`
   - G1: `最近遊玩時間`

---

## 🚀 3. Google Apps Script (GAS) 後端部署

1. 在剛才建立的 Google 試算表中，點擊上方選單的 **「擴充功能」 -> 「Apps Script」**。
2. 將編輯器內原有的程式碼清空，並貼上以下完整程式碼：

```javascript
const SHEET_QUESTIONS = "題目";
const SHEET_ANSWERS = "回答";

// 處理 GET 請求 (抓取題目)
function doGet(e) {
  const count = Number(e.parameter.count) || 5;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_QUESTIONS);
  const data = sheet.getDataRange().getValues();
  
  // 移除標題列
  const headers = data.shift(); 
  
  let questions = data.map(row => ({
    id: row[0],
    text: row[1],
    A: row[2],
    B: row[3],
    C: row[4],
    D: row[5],
    ans: row[6]
  })).filter(q => q.text !== ""); // 過濾空行
  
  // 隨機打亂並取前 N 題
  questions.sort(() => Math.random() - 0.5);
  questions = questions.slice(0, count);
  
  return ContentService.createTextOutput(JSON.stringify({ questions: questions }))
                       .setMimeType(ContentService.MimeType.JSON);
}

// 處理 POST 請求 (寫入成績)
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.action === "submitScore") {
      const { id, score, passed } = payload;
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ANSWERS);
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      // 找尋是否已有此 ID
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      const now = new Date();
      
      if (rowIndex !== -1) {
        // 更新舊玩家資料
        const rowData = data[rowIndex - 1];
        const currentTries = Number(rowData[1]) || 0;
        const currentTotalScore = Number(rowData[2]) || 0;
        const currentHighScore = Number(rowData[3]) || 0;
        const firstPassScore = rowData[4];
        
        sheet.getRange(rowIndex, 2).setValue(currentTries + 1); // 闖關次數
        sheet.getRange(rowIndex, 3).setValue(currentTotalScore + score); // 總分
        sheet.getRange(rowIndex, 4).setValue(Math.max(currentHighScore, score)); // 最高分
        
        // 如果是首次通關
        if (passed && firstPassScore === "") {
          sheet.getRange(rowIndex, 5).setValue(score); // 第一次通關分數
          sheet.getRange(rowIndex, 6).setValue(currentTries + 1); // 花了幾次通關
        }
        sheet.getRange(rowIndex, 7).setValue(now); // 最近遊玩時間
      } else {
        // 新增玩家資料
        sheet.appendRow([
          id, // ID
          1, // 闖關次數
          score, // 總分
          score, // 最高分
          passed ? score : "", // 第一次通關分數
          passed ? 1 : "", // 花了幾次通關
          now // 最近遊玩時間
        ]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 點選右上角 **「部署」 -> 「新增部署作業」**。
4. 點擊左上方齒輪「選取類型」，勾選 **「網頁應用程式」**。
5. 設定如下：
   - 執行身分：**我**
   - 誰可以存取：**所有人 (任何人)**
6. 點選 **「部署」** (初次部署需授權，請點擊「授權存取」 -> 選擇您的帳號 -> 「進階」 -> 「前往 不安全 的頁面」 -> 「允許」)。
7. 部署完成後，複製 **「網頁應用程式網址」**。

---

## 🔗 4. 串接前端專案 (.env)

1. 在專案根目錄找到 `.env` 檔案。
2. 將剛才複製的 GAS 網址貼上，替換掉預設值：

```env
VITE_GOOGLE_APP_SCRIPT_URL=https://script.google.com/macros/s/你的_GAS_ID/exec
VITE_PASS_THRESHOLD=3
VITE_QUESTION_COUNT=5
```

3. 儲存檔案後，Vite 開發伺服器會自動熱重載 (Hot Reload)，遊戲即可正式與 Google Sheets 連動！

---

## ☁️ 5. 透過 GitHub Actions 自動部署到 GitHub Pages

此專案已內建 `.github/workflows/deploy.yml` 腳本，只要將程式碼推送到 GitHub，就能自動部署成公開網頁：

1. **建立 GitHub Repository 並推送程式碼**
   將這個資料夾推送到您自己的 GitHub Repository 的 `main` 或 `master` 分支。
   > **注意**：專案已經包含 `.gitignore`，會自動過濾掉 `node_modules` 與敏感的 `.env` 檔案以確保安全。您只需要將 `.env.example` 複製後改為 `.env` 在本地使用即可。
2. **修改 Vite Base Path (若有需要)**
   如果您的 Repository 網址是 `https://<username>.github.io/<repo-name>/` (子目錄形式)，請修改專案根目錄中的 `vite.config.js`，增加 `base` 屬性：
   ```javascript
   export default defineConfig({
     plugins: [react()],
     base: '/您的Repo名稱/', // 例如: '/pixel-game/'
   })
   ```
3. **開啟 GitHub Pages 權限設定**
   進入您在 GitHub 的專案庫 -> **Settings** -> **Pages**。
   在 **Build and deployment** > Source 選擇 **`GitHub Actions`**。
4. **自動部署完成**
   往後只要推送程式碼到 `main` 或 `master` 分支，GitHub Actions 就會自動觸發並完成部署。您可以在 GitHub 的 Actions 頁籤查看部署進度。
