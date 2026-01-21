// ===================================
// Global State
// ===================================
let companiesData = [];
let financialData = [];
let selectedCompany = null;
let charts = {};

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
});

// ===================================
// Data Loading
// ===================================
async function loadData() {
    try {
        // Add timestamp to prevent caching issues
        const timestamp = new Date().getTime();

        // Load companies list
        const companiesResponse = await fetch(`companies.json?v=${timestamp}`);
        companiesData = await companiesResponse.json();

        // Load financial data - 使用中華電信的EXCEL檔案
        const excelResponse = await fetch(`授信標準.xlsx?v=${timestamp}`);
        const excelBuffer = await excelResponse.arrayBuffer();

        // Parse EXCEL file using SheetJS
        const workbook = XLSX.read(excelBuffer, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        // Process the data
        financialData = jsonData.map(row => {
            const processed = {};
            for (let key in row) {
                processed[key.trim()] = parseValue(row[key]);
            }
            return processed;
        }).filter(record => record.ID || record['ID']); // 過濾掉沒有ID的行

        console.log('資料載入成功:', {
            公司數量: companiesData.length,
            財務記錄數: financialData.length,
            EXCEL工作表名稱: firstSheetName,
            資料範例: financialData[0]
        });

        // 自動選擇中華電信
        if (companiesData.length > 0) {
            selectCompany(companiesData[0].id);
        }
    } catch (error) {
        console.error('載入資料時發生錯誤:', error);
        alert('無法載入資料，請確認 授信標準.xlsx 檔案存在且格式正確。');
    }
}

function parseValue(value) {
    // 處理空值
    if (value === null || value === undefined || value === '' || value === '-' || value === ' ') {
        return 0;
    }

    // 如果已經是數字，直接返回
    if (typeof value === 'number') {
        return value;
    }

    // 轉換為字串並清理
    const strValue = String(value).trim();

    // 移除前後空白和引號
    const cleaned = strValue.replace(/^["'\s]+|["'\s]+$/g, '').replace(/[\s,]/g, '');

    // 處理百分比
    if (cleaned.includes('%')) {
        const numValue = parseFloat(cleaned.replace('%', ''));
        return isNaN(numValue) ? 0 : numValue / 100;
    }

    // 嘗試轉換為數字
    const numValue = parseFloat(cleaned);
    return isNaN(numValue) ? strValue : numValue;
}

// ===================================
// Event Listeners
// ===================================
function setupEventListeners() {
    const searchInput = document.getElementById('company-search');
    const suggestionsBox = document.getElementById('suggestions');
    const clearBtn = document.getElementById('clear-search');

    // Toggle clear button visibility
    function toggleClearButton() {
        if (searchInput.value.trim().length > 0) {
            clearBtn.classList.add('show');
        } else {
            clearBtn.classList.remove('show');
        }
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        // Toggle clear button
        toggleClearButton();

        if (query.length === 0) {
            suggestionsBox.classList.remove('show');
            return;
        }

        const matches = companiesData.filter(company =>
            company.id.toLowerCase().includes(query) ||
            company.name.toLowerCase().includes(query) ||
            company.nameEn.toLowerCase().includes(query)
        );

        displaySuggestions(matches);
    });

    // Clear button click handler
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        suggestionsBox.classList.remove('show');
        clearBtn.classList.remove('show');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            suggestionsBox.classList.remove('show');
        }
    });

    // Settings Modal Listeners
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings');

    const geminiInput = document.getElementById('gemini-key');
    const newsInput = document.getElementById('news-key');

    openSettingsBtn.addEventListener('click', () => {
        geminiInput.value = localStorage.getItem('GEMINI_API_KEY') || '';
        newsInput.value = localStorage.getItem('NEWS_API_KEY') || '';
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    saveSettingsBtn.addEventListener('click', () => {
        localStorage.setItem('GEMINI_API_KEY', geminiInput.value.trim());
        localStorage.setItem('NEWS_API_KEY', newsInput.value.trim());
        alert('設定已儲存！頁面將重新載入。');
        location.reload();
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });
}

function displaySuggestions(companies) {
    const suggestionsBox = document.getElementById('suggestions');

    if (companies.length === 0) {
        suggestionsBox.classList.remove('show');
        return;
    }

    suggestionsBox.innerHTML = companies.map(company => `
        <div class="suggestion-item" data-id="${company.id}">
            <span class="company-code">${company.id}</span>
            <span class="company-name">${company.name}</span>
        </div>
    `).join('');

    suggestionsBox.classList.add('show');

    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const companyId = item.dataset.id;
            selectCompany(companyId);
            suggestionsBox.classList.remove('show');
        });
    });
}

function selectCompany(companyId) {
    const company = companiesData.find(c => c.id === companyId);
    if (!company) return;

    selectedCompany = company;

    document.getElementById('company-search').value = `${company.id} ${company.name}`;

    loadCompanyData(companyId);
}

// ===================================
// Company Data Display
// ===================================
function loadCompanyData(companyId) {
    // 將ID統一轉為字串進行比較，避免型別不匹配
    const companyRecords = financialData.filter(record => String(record.ID) === String(companyId));

    if (companyRecords.length === 0) {
        alert('找不到該客戶的財務資料。請確認 中華電_授信標準.xlsx 檔案包含此公司資料。');
        return;
    }

    // Sort by year ascending (從舊到新)
    companyRecords.sort((a, b) => a.Year - b.Year);

    // Display charts
    displayCharts(companyRecords);

    // Calculate and display credit score
    calculateCreditScore(companyRecords);

    // Show charts section
    document.getElementById('charts-section').classList.remove('hidden');

    // Show score section
    document.getElementById('score-section').classList.remove('hidden');

    // Show AML section
    document.getElementById('aml-section').classList.remove('hidden');

    // Update title
    document.getElementById('company-title').textContent = `${selectedCompany.name} - 財務比率分析`;

    // Execute AML check
    checkAML(selectedCompany.name);
}

function displayCharts(records) {
    const years = records.map(r => r.Year);

    // Destroy existing charts
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};

    // 計算並顯示各項指標的平均值
    const avgSTD = calculateAverage(records.map(r => r.STD));
    const avgCPLTD = calculateAverage(records.map(r => r.CPLTD));
    const avgLTD = calculateAverage(records.map(r => r.LTD));
    const avgEBITDA = calculateAverage(records.map(r => r.EBITDA));
    const avgSales = calculateAverage(records.map(r => r.Sales));
    const avgFCF = calculateAverage(records.map(r => r.FCF));
    const avgTIE = calculateAverage(records.map(r => r.TIE));
    const avgCR = calculateAverage(records.map(r => r.CR));

    // 顯示平均值
    document.getElementById('avg-std').textContent = `平均值: ${formatNumber(avgSTD)} 仟元`;
    document.getElementById('avg-cpltd').textContent = `平均值: ${formatNumber(avgCPLTD)} 仟元`;
    document.getElementById('avg-ltd').textContent = `平均值: ${formatNumber(avgLTD)} 仟元`;
    document.getElementById('avg-ebitda').textContent = `平均值: ${formatNumber(avgEBITDA)} 仟元`;
    document.getElementById('avg-sales').textContent = `平均值: ${formatNumber(avgSales)} 仟元`;
    document.getElementById('avg-fcf').textContent = `平均值: ${formatNumber(avgFCF)} 仟元`;
    document.getElementById('avg-tie').textContent = `平均值: ${avgTIE.toFixed(2)}`;
    document.getElementById('avg-cr').textContent = `平均值: ${avgCR.toFixed(2)}`;

    // 短期借款
    charts.std = createBarChart('chart-std', '短期借款', years, records.map(r => r.STD), '#3b82f6');

    // 一年內到期長期負債
    charts.cpltd = createBarChart('chart-cpltd', '一年內到期長期負債', years, records.map(r => r.CPLTD), '#f59e0b');

    // 長期負債
    charts.ltd = createBarChart('chart-ltd', '長期負債', years, records.map(r => r.LTD), '#8b5cf6');

    // EBITDA
    charts.ebitda = createLineChart('chart-ebitda', 'EBITDA', years, records.map(r => r.EBITDA), '#10b981');

    // 營收淨額
    charts.sales = createLineChart('chart-sales', '營收淨額', years, records.map(r => r.Sales), '#6366f1');

    // 自由現金流量
    charts.fcf = createBarChart('chart-fcf', '自由現金流量', years, records.map(r => r.FCF), '#14b8a6', true);

    // 利息保障倍數
    charts.tie = createLineChart('chart-tie', '利息保障倍數', years, records.map(r => r.TIE), '#ec4899');

    // 流動比率
    charts.cr = createLineChart('chart-cr', '流動比率', years, records.map(r => r.CR), '#f97316');
}

// 計算平均值輔助函數
function calculateAverage(values) {
    // 過濾掉非數值（NaN、null、undefined）並轉換為數字
    const validValues = values
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v) && v !== null && v !== undefined);

    if (validValues.length === 0) return 0;

    const sum = validValues.reduce((acc, val) => acc + val, 0);
    return sum / validValues.length;
}

// 格式化數字顯示
function formatNumber(num) {
    if (isNaN(num) || num === null || num === undefined) return '0';
    return num.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

// ===================================
// Chart Creation Functions
// ===================================
function createBarChart(canvasId, label, labels, data, color, allowNegative = false) {
    const ctx = document.getElementById(canvasId);

    // 如果允許負值，使用不同顏色
    let backgroundColor, borderColor;
    if (allowNegative) {
        backgroundColor = data.map(val => val >= 0 ? color + '99' : '#ef444499');
        borderColor = data.map(val => val >= 0 ? color : '#ef4444');
    } else {
        backgroundColor = color + '99';
        borderColor = color;
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: !allowNegative,
                    grid: {
                        color: '#e2e8f0'
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return value.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

function createLineChart(canvasId, label, labels, data, color) {
    const ctx = document.getElementById(canvasId);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                backgroundColor: color + '33',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#e2e8f0'
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return value.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            }
        }
    });
}


// ===================================
// ===================================
// AI評分系統 - 使用Gemini API
// ===================================
async function calculateCreditScore(records) {
    try {
        // 顯示載入狀態
        document.getElementById('ai-comment').classList.add('loading');
        document.getElementById('ai-comment-text').textContent = 'AI正在分析財務數據...';
        document.getElementById('score-grade').textContent = '分析中...';

        // 計算平均值
        const avgData = calculateAverageData(records);

        // 準備給AI的財務數據
        const financialData = {
            公司名稱: selectedCompany.name,
            股票代號: selectedCompany.id,
            產業別: selectedCompany.industry || "一般產業",
            分析期間: `${records[0].Year} - ${records[records.length - 1].Year}`,
            平均財務指標: {
                短期借款: Math.round(avgData.STD),
                一年內到期長期負債: Math.round(avgData.CPLTD),
                長期負債: Math.round(avgData.LTD),
                EBITDA: Math.round(avgData.EBITDA),
                營收淨額: Math.round(avgData.Sales),
                自由現金流量: Math.round(avgData.FCF),
                利息保障倍數: avgData.TIE.toFixed(2),
                流動比率: avgData.CR.toFixed(2),
                資本支出: Math.round(avgData.CapEx),
                總資產: Math.round(avgData.Assets)
            },
            計算指標: {
                償債年限: ((avgData.STD + avgData.CPLTD + avgData.LTD) / avgData.EBITDA).toFixed(2),
                現金流償債能力: ((avgData.FCF / (avgData.STD + avgData.CPLTD + avgData.LTD)) * 100).toFixed(2) + '%',
                短期債務結構: ((avgData.STD / avgData.Assets) * 100).toFixed(2) + '%',
                資本支出效率: ((avgData.CapEx / avgData.FCF) * 100).toFixed(2) + '%'
            }
        };

        // 檢查 API Key
        if (!GEMINI_API_KEY) {
            document.getElementById('ai-comment').classList.remove('loading');
            document.getElementById('ai-comment-text').textContent = '⚠️ 請先點擊右上角設定按鈕並輸入 Gemini API Key';
            document.getElementById('score-grade').textContent = '未設定';
            return;
        }

        // 調用Gemini API
        const aiResponse = await callGeminiAPI(financialData);

        // 顯示AI評分結果
        displayAIScore(aiResponse);

    } catch (error) {
        console.error('AI評分錯誤:', error);
        document.getElementById('ai-comment').classList.remove('loading');
        document.getElementById('ai-comment-text').textContent = '⚠️ AI評分暫時無法使用，請稍後再試';
        document.getElementById('total-score').textContent = '--';
        document.getElementById('score-grade').textContent = '錯誤';
    }
}

// 計算所有平均值
function calculateAverageData(records) {
    return {
        STD: calculateAverage(records.map(r => r.STD || 0)),
        CPLTD: calculateAverage(records.map(r => r.CPLTD || 0)),
        LTD: calculateAverage(records.map(r => r.LTD || 0)),
        EBITDA: calculateAverage(records.map(r => r.EBITDA || 0)),
        Sales: calculateAverage(records.map(r => r.Sales || 0)),
        FCF: calculateAverage(records.map(r => r.FCF || 0)),
        TIE: calculateAverage(records.map(r => r.TIE || 0)),
        CR: calculateAverage(records.map(r => r.CR || 0)),
        CapEx: calculateAverage(records.map(r => r.CapEx || 0)),
        Assets: calculateAverage(records.map(r => r.Assets || 0))
    };
}

// 調用Gemini API
async function callGeminiAPI(financialData) {
    const prompt = `你是一位專業的授信審核專員，請根據以下財務數據進行評分和分析：

${JSON.stringify(financialData, null, 2)}

請以JSON格式回傳評估結果（僅回傳JSON，不要其他文字）：
{
  "總分": 0-100的整數,
  "風險等級": "低風險" 或 "中風險" 或 "高風險",
  "評語": "一句話的專業評語（30字以內，說明主要優勢或風險）",
  "細項評分": {
    "償債年限": 0-20的整數,
    "EBITDA穩定性": 0-20的整數,
    "現金流償債能力": 0-20的整數,
    "利息保障倍數": 0-10的整數,
    "資本支出效率": 0-10的整數,
    "流動比率": 0-5的整數,
    "營收成長穩定性": 0-5的整數,
    "短期債務結構": 0-10的整數
  }
}

評分標準（請嚴格參考）：
1. 償債年限 (20分)：越低越好
2. EBITDA穩定性 (20分)：波動越小越好
3. 現金流償債能力 (20分)：越高越好
4. 利息保障倍數 (10分)：越高越好
5. 資本支出效率 (10分)：適中為佳
6. 流動比率 (5分)：>1為佳
7. 營收成長穩定性 (5分)：波動越小越好
8. 短期債務結構 (10分)：佔比越低越好

總分 = 所有細項評分之和。

**重要：請根據該公司的產業別特性進行評分**
- 電信業：資本密集、現金流穩定、EBITDA高
- 半導體業：資本支出高、營收波動大、技術密集
- 電子製造業：毛利低、週轉快、營運資金需求高
- 金融保險業：槓桿高、流動性要求嚴格、利息收入為主
- 塑膠化工業：景氣循環明顯、原物料成本敏感

請綜合考慮：
1. 產業特性（根據「產業別」欄位調整評分標準）
2. 償債能力（負債/EBITDA、利息保障倍數、流動比率）
3. 現金流健康度（FCF償債能力、資本支出效率）
4. 整體財務結構與產業平均水準比較`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 8192,
            }
        })
    });

    if (!response.ok) {
        throw new Error(`API錯誤: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;

    // 提取JSON（AI可能會包含```json標記）
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('無法解析AI回應');
    }

    return JSON.parse(jsonMatch[0]);
}

// 顯示AI評分結果
function displayAIScore(aiResponse) {
    // 移除載入狀態
    document.getElementById('ai-comment').classList.remove('loading');

    // 顯示分數
    document.getElementById('total-score').textContent = aiResponse.總分;

    // 顯示風險等級（帶顏色）
    const gradeElement = document.getElementById('score-grade');
    gradeElement.textContent = aiResponse.風險等級;
    gradeElement.className = 'score-grade';

    if (aiResponse.總分 >= 81) {
        gradeElement.classList.add('low-risk');
    } else if (aiResponse.總分 >= 51) {
        gradeElement.classList.add('medium-risk');
    } else {
        gradeElement.classList.add('high-risk');
    }

    // 顯示AI評語
    document.getElementById('ai-comment-text').textContent = aiResponse.評語;

    // 顯示詳細評分breakdown
    const breakdown = document.querySelector('.score-breakdown');
    breakdown.style.display = 'grid'; // 恢復顯示

    // 填入各項分數
    if (aiResponse.細項評分) {
        document.getElementById('score-debt-ebitda').textContent = `${aiResponse.細項評分.償債年限 || '--'} / 20`;
        document.getElementById('score-ebitda-std').textContent = `${aiResponse.細項評分.EBITDA穩定性 || '--'} / 20`;
        document.getElementById('score-fcf-debt').textContent = `${aiResponse.細項評分.現金流償債能力 || '--'} / 20`;
        document.getElementById('score-tie').textContent = `${aiResponse.細項評分.利息保障倍數 || '--'} / 10`;
        document.getElementById('score-capex').textContent = `${aiResponse.細項評分.資本支出效率 || '--'} / 10`;
        document.getElementById('score-cr').textContent = `${aiResponse.細項評分.流動比率 || '--'} / 5`;
        document.getElementById('score-sales-std').textContent = `${aiResponse.細項評分.營收成長穩定性 || '--'} / 5`;
        document.getElementById('score-std-assets').textContent = `${aiResponse.細項評分.短期債務結構 || '--'} / 10`;
    }
}

// ===================================
// AML Detection Functions
// ===================================
async function checkAML(companyName) {
    const amlContent = document.getElementById('aml-content');

    // 顯示載入狀態
    amlContent.innerHTML = `
        <div class="aml-loading">
            <div class="loading-spinner"></div>
            <p>正在搜尋相關新聞並分析風險...</p>
        </div>
    `;

    try {
        // Step 1: 使用 News API 搜尋相關新聞
        const newsKeywords = `${companyName} (洗錢 OR 非法交易 OR 詐欺 OR 金融犯罪 OR money laundering OR fraud)`;
        const newsUrl = `${NEWS_API_URL}?q=${encodeURIComponent(newsKeywords)}&lang=zh&max=10&token=${NEWS_API_KEY}`;

        // 檢查 API Key
        if (!NEWS_API_KEY) {
            amlContent.innerHTML = `
                <div class="aml-result risk">
                    <div class="aml-icon">⚠️</div>
                    <div class="aml-text">
                        <h3>未設定 API Key</h3>
                        <p>請點擊右上角設定按鈕輸入 GNews API Key 以啟用 AML 檢測。</p>
                    </div>
                </div>
            `;
            return;
        }

        const newsResponse = await fetch(newsUrl);

        if (!newsResponse.ok) {
            throw new Error(`News API錯誤: ${newsResponse.status}`);
        }

        const newsData = await newsResponse.json();
        const articles = newsData.articles || [];

        // Step 2: 如果找到新聞，用 Gemini AI 分析風險
        let amlResult;

        if (articles.length > 0) {
            // 整理新聞標題和描述
            const newsText = articles.slice(0, 5).map((article, index) =>
                `${index + 1}. ${article.title}\n   ${article.description || ''}`
            ).join('\n\n');

            // 用 AI 分析新聞內容
            const prompt = `你是一位專業的反洗錢（AML）分析師。以下是關於「${companyName}」的最新新聞：

${newsText}

請分析這些新聞是否涉及以下 AML 風險：
- 洗錢（Money Laundering）
- 非法交易（Illegal Transactions）
- 詐欺（Fraud）
- 金融犯罪（Financial Crime）
- 制裁（Sanctions）
- 貪污（Corruption）

請以JSON格式回傳評估結果（僅回傳JSON，不要其他文字）：
{
  "hasRisk": true 或 false,
  "riskLevel": "高風險" 或 "安全",
  "reason": "若有風險，請說明具體原因；若無風險，則填寫：該客戶未涉及 AML 等負面新聞"
}`;

            const aiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!aiResponse.ok) {
                throw new Error(`AI API錯誤: ${aiResponse.status}`);
            }

            const aiData = await aiResponse.json();
            const aiText = aiData.candidates[0].content.parts[0].text;

            // 提取JSON
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('無法解析AI回應');
            }

            amlResult = JSON.parse(jsonMatch[0]);
        } else {
            // 沒有找到相關負面新聞
            amlResult = {
                hasRisk: false,
                riskLevel: "安全",
                reason: "該客戶未涉及 AML 等負面新聞"
            };
        }

        displayAMLResult(amlResult);

    } catch (error) {
        console.error('AML檢測錯誤:', error);
        amlContent.innerHTML = `
            <div class="aml-result risk">
                <div class="aml-icon">⚠️</div>
                <div class="aml-text">
                    <h3>檢測失敗</h3>
                    <p>無法完成 AML 檢測，請稍後再試。錯誤：${error.message}</p>
                </div>
            </div>
        `;
    }
}

function displayAMLResult(result) {
    const amlContent = document.getElementById('aml-content');

    if (result.hasRisk) {
        // 高風險狀態
        amlContent.innerHTML = `
            <div class="aml-result risk">
                <div class="aml-icon">🚨</div>
                <div class="aml-text">
                    <h3>⚠️ 高風險警告</h3>
                    <p>${result.reason}</p>
                </div>
            </div>
        `;
    } else {
        // 安全狀態
        amlContent.innerHTML = `
            <div class="aml-result safe">
                <div class="aml-icon">✅</div>
                <div class="aml-text">
                    <h3>✓ 通過 AML 檢測</h3>
                    <p>${result.reason}</p>
                </div>
            </div>
        `;
    }
}
