# 授信風險評估系統 (Credit Risk Assessment System)

這是一個基於 Web 的自動化授信風險評估工具。它能從 Excel 檔案中載入公司財務數據，並結合 AI (Gemini) 與外部新聞 API (GNews) 進行深度的信用風險評估。

## 🌟 主要功能

- **Excel 數據整合**：自動解析包含超過 2,000 家公司的財務報表數據 (SheetJS 驅動)。
- **智能搜尋**：快速檢索公司代號、名稱（支援一鍵清除功能）。
- **財務視覺化**：使用 Chart.js 展示 8 項關鍵財務指標圖表。
- **AI 授信評分**：串接 Google Gemini API，根據產業特性提供量化評分與專業點評。
- **AML 反洗錢檢測**：整合 GNews API 查詢即時負面新聞，協助洗錢防制審查。
- **快取防止機制**：確保每次載入都是最新的 Excel 數據與程式碼版本。

## 🚀 快速上手

1. **環境需求**：
   - 任何現代瀏覽器 (Chrome, Edge, Safari)。
   - 簡易本地伺服器（推薦使用 Python: `python3 -m http.server 8000`）。

2. **API 設定**：
   - 複製 `.env.example` 並重新命名為 `.env` (用於記錄金鑰)。
   - 打開 `config.js` 並填入您的 **Gemini API Key** 與 **GNews API Key**。

3. **啟動**：
   - 在瀏覽器中打開 `http://localhost:8000` 即可開始使用。

## 🛠 輔助工具

- `extract_all_companies.py`: 用於從原始 Excel 中提取所有公司清單並生成 `companies.json` 的 Python 腳本。

## 📚 使用技術

- **前端**: Vanilla JS, CSS3 (Glassmorphism design), HTML5.
- **庫**: [SheetJS](https://sheetjs.com/), [Chart.js](https://www.chartjs.org/).
- **AI/API**: Google Gemini Flash, GNews API.

---

## 📄 授權說明
此專案僅供開發與研究用途。使用時請確保符合相關 API 之服務條款。
