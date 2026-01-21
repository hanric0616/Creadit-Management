// Gemini API 配置
// API 配置 (由使用者於網頁介面輸入並儲存於 localStorage)
const GEMINI_API_KEY = localStorage.getItem('GEMINI_API_KEY') || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// Google News API 配置
const NEWS_API_KEY = localStorage.getItem('NEWS_API_KEY') || '';
const NEWS_API_URL = 'https://gnews.io/api/v4/search';
