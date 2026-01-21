# API設定說明

## 當前狀態

系統目前遇到的API問題：

### 1. Gemini API (AI評分)
- **錯誤**: 429 Too Many Requests
- **原因**: 
  - 免費版API有速率限制（每分鐘請求次數有限）
  - 短時間內多次測試觸發了限制
- **狀態**: ⏳ **等待速率限制重置**（通常幾分鐘後自動恢復）
- **模型**: 已修正為 `gemini-1.5-flash`

### 2. News API (AML檢測)
- **錯誤**: 401 Unauthorized  
- **原因**: API金鑰無效或已過期
- **狀態**: ❌ **需要更新金鑰**

---

## 解決方案

### 方案1: 等待Gemini API恢復（AI評分）
Gemini免費版有速率限制，通常幾分鐘後會自動重置。

**建議**: 等待5-10分鐘後再試

### 方案2: 更新News API金鑰（AML檢測）

1. 前往 [GNews.io](https://gnews.io/) 註冊帳號
2. 獲取新的API金鑰
3. 更新 `config.js` 中的 `NEWS_API_KEY`
4. 清除瀏覽器快取（CMD+SHIFT+R）

### 方案3: 暫時停用AML檢測

如果不需要AML功能，可以在 `app.js` 中註解掉相關代碼：

```javascript
// 在 loadCompanyData 函數中註解這行
// checkAML(selectedCompany.name);
```

---

## 清除瀏覽器快取

**重要**: 每次修改`config.js`後必須清除快取！

- **Mac**: CMD + SHIFT + R
- **Windows**: CTRL + SHIFT + R
- **或訪問**: `http://localhost:8000/?v=新的隨機數字`

---

## API金鑰位置

檔案: `config.js`

```javascript
// Gemini API 配置
const GEMINI_API_KEY = '您的Gemini API金鑰';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Google News API 配置
const NEWS_API_KEY = '您的GNews API金鑰';
const NEWS_API_URL = 'https://gnews.io/api/v4/search';
```

---

## 如何獲取API金鑰

### Gemini API
1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登入Google帳號
3. 點選「Get API Key」
4. 複製金鑰並更新`config.js`

### GNews API
1. 前往 [GNews.io](https://gnews.io/)
2. 點選「Get API Key」
3. 註冊並驗證email
4. 複製金鑰並更新`config.js`

---

## 速率限制說明

### Gemini API (免費版)
- 每分鐘: 15次請求
- 每天: 1500次請求
- **建議**: 避免短時間內重複刷新頁面

### GNews API (免費版)
- 每天: 100次請求
- **建議**: 開發階段可以暫時停用AML檢測

---

## 測試步驟

修改API金鑰後：

1. 儲存`config.js`
2. 在瀏覽器按 **CMD+SHIFT+R** 強制刷新
3. 搜尋並選擇一家公司
4. 等待AI評分（約3-5秒）
5. 檢查是否顯示分數和評語

如AI評分仍無法運作，請檢查瀏覽器控制台的錯誤訊息。
