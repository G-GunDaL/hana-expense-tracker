// Initial Configuration
const chartConfig = {
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(23, 25, 30, 0.9)',
                titleColor: '#8b92a5',
                bodyColor: '#fff',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                display: true, // Enable X axis
                grid: {
                    display: false
                },
                ticks: {
                    color: '#8b92a5',
                    font: {
                        family: "'JetBrains Mono', monospace",
                        size: 10
                    },
                    maxTicksLimit: 6,
                    maxRotation: 0,
                    autoSkip: true
                }
            },
            y: {
                position: 'right',
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: '#8b92a5',
                    font: {
                        family: "'JetBrains Mono', monospace",
                        size: 11
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 6
            },
            line: {
                tension: 0.2, // Less smooth for financial data
                borderWidth: 2
            }
        },
        animation: {
            duration: 0
        }
    }
};

// Indices Configuration
const indices = [
    { id: 'kospi', symbol: '^KS11', name: 'KOSPI', range: '5y', interval: '1mo', type: 'candlestick' },
    { id: 'kosdaq', symbol: '^KQ11', name: 'KOSDAQ', range: '5y', interval: '1mo', type: 'candlestick' },
    { id: 'nasdaq', symbol: '^IXIC', name: 'NASDAQ', range: '5y', interval: '1mo', type: 'candlestick' },
    { id: 'sp500', symbol: '^GSPC', name: 'S&P 500', range: '5y', interval: '1mo', type: 'candlestick' }
];

// Chart Instances
const charts = {};

// Fetch Stock Data
// --- Global Cache ---
const apiCache = new Map();

// --- Centralized API Fetcher with Cache & fallback ---
async function fetchYahooData(symbol, range, interval, timeout = 10000) {
    const cacheKey = `${symbol}-${range}-${interval}`;

    if (apiCache.has(cacheKey)) {
        console.log(`[Cache Hit] ${cacheKey}`);
        return apiCache.get(cacheKey);
    }

    const rawUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const encodedUrl = encodeURIComponent(rawUrl);

    const proxies = [
        `https://api.allorigins.win/raw?url=${encodedUrl}`,
        `https://corsproxy.io/?url=${encodedUrl}`
    ];

    // Create a promise to store in cache immediately (request deduplication)
    const fetchPromise = (async () => {
        for (const proxyUrl of proxies) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(proxyUrl, { signal: controller.signal });
                clearTimeout(id);
                if (!response.ok) continue;

                const data = await response.json();
                if (data.chart && data.chart.result) {
                    return data.chart.result[0];
                }
            } catch (e) {
                // console.warn(`Proxy failed: ${proxyUrl}`, e);
            }
        }
        // If all proxies fail, invalidating cache so we can retry
        apiCache.delete(cacheKey);
        return null;
    })();

    apiCache.set(cacheKey, fetchPromise);
    return fetchPromise;
}

// --- Fetch Stock Data (For UI/Search) ---
async function fetchStockData(symbol, range = '1d', interval = '5m', retries = 1) {
    // We ignore retries argument as fetchYahooData handles proxy failover

    // Cloud Cache Check (Optional: For Search? usually we search new things)
    // Only use cloud checks for "known" symbols maybe? 
    // Actually, if we search a symbol we track, we should show it.
    if (cloudCache.stocks[symbol]) {
        // Return cached data immediately if recent?
        // Or just let the UI handle the "Show Cached" separately?
        // fetchStockData is a utility. Let's not inject Cloud Cache return here 
        // unless we want "Offline Mode".
        // BUT the requirement is: "If already in drive, use it while fetching"
        // This suggests the CALLER should check cache.
        // However, making fetchStockData smart is easier.
    }

    const result = await fetchYahooData(symbol, range, interval);

    if (!result) {
        // Fallback to cache if network fails?
        if (cloudCache.stocks[symbol]) {
            console.log(`[Network Failed] Returning cached data for ${symbol}`);
            return cloudCache.stocks[symbol];
        }
        console.error(`Failed to fetch stock data for ${symbol}`);
        return null;
    }

    try {
        const timestamps = result.timestamp || [];
        const quotes = result.indicators.quote[0];

        const opens = quotes.open || [];
        const highs = quotes.high || [];
        const lows = quotes.low || [];
        const closes = quotes.close || [];

        const validData = timestamps.map((t, i) => ({
            time: t,
            o: opens[i],
            h: highs[i],
            l: lows[i],
            c: closes[i]
        })).filter(item => item.c !== null && item.o !== null);

        const regularMarketPrice = result.meta.regularMarketPrice;
        const chartPreviousClose = result.meta.chartPreviousClose;
        const stockName = result.meta.shortName || result.meta.longName || symbol;

        return {
            ohlc: validData,
            prices: validData.map(item => item.c),
            timestamps: validData.map(item => item.time),
            currentPrice: regularMarketPrice,
            prevClose: chartPreviousClose,
            lastUpdated: validData.length > 0 ? validData[validData.length - 1].time : null,
            name: stockName,
        };
    } catch (error) {
        console.error('Data parsing error:', error);
        return null;
    }
}

// --- Fetch Historical Data (For Portfolio Analysis) ---
async function fetchHistory(symbol, range, timeout = 10000) {
    let interval = '1d';
    if (['10y', '7y', '5y'].includes(range)) interval = '1wk';
    if (range === '10y') interval = '1mo';

    return fetchYahooData(symbol, range, interval, timeout);
}

// Initialize Charts
// Initialize Charts
async function initCharts() {
    // 1. Initialize all Chart instances instantly
    for (const index of indices) {
        const ctx = document.getElementById(`${index.id}Chart`).getContext('2d');

        // Initial empty chart
        const config = JSON.parse(JSON.stringify(chartConfig));
        config.options.scales.x.display = true;

        config.data = {
            labels: [],
            datasets: [{
                label: index.name,
                data: [],
                borderColor: '#2ebd85',
                backgroundColor: 'rgba(46, 189, 133, 0.2)',
                fill: true
            }]
        };

        charts[index.id] = new Chart(ctx, config);
    }

    // 2. Fetch data in parallel
    const promises = indices.map(index => updateIndexData(index));
    await Promise.all(promises);
}

// Update Single Index Data
// Update Single Index Data
async function updateIndexData(index) {
    const symbol = index.symbol;

    // 1. Check Cloud Cache First
    if (cloudCache.indices[symbol]) {
        console.log(`[Cloud Cache Hit] ${symbol}`);
        const cachedData = cloudCache.indices[symbol];
        // Create chart data structure from cached
        // Note: We might need to store full chart data or just current price?
        // Let's assume we store the 'fetched data object' entirely.
        const chart = charts[index.id];
        updateChartUI(chart, cachedData, index.id, true, index.type);
    }

    // 2. Fetch Fresh Data
    const data = await fetchStockData(index.symbol, index.range, index.interval);
    if (!data) return;

    // 3. Update Cache & Save
    index.lastData = data;
    cloudCache.indices[symbol] = data; // Update Cache
    // Trigger Save (Debounced)
    saveToDrive();

    const chart = charts[index.id];
    updateChartUI(chart, data, index.id, true, index.type);
}

// Reuseable Chart UI Update
function updateChartUI(chart, data, elementIdPrefix, showTimes = true, currentType = 'line') {
    const prices = data.prices;
    const timestamps = data.timestamps || [];
    const currentPrice = data.currentPrice;
    const prevClose = data.prevClose;

    // Determine color based on change from previous close
    const isPositive = currentPrice >= prevClose;
    const color = isPositive ? '#2ebd85' : '#f6465d';

    // Format Labels (X-Axis)
    const labels = timestamps.map(t => {
        // Timestamps are UNIX UTC.
        const d = new Date(t * 1000);

        // Format based on range (approximate heuristic)
        if (timestamps.length > 1) {
            const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];

            // If range > 365 days (approx 31536000 seconds), show YYYY/MM
            if (timeSpan > 31536000) {
                return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            }
            // If range > 2 days, show MM/DD
            else if (timeSpan > 86400 * 2) {
                return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
            }
        }
        // Show HH:mm
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });

    // Check if chart type matches desired type
    const isCandle = currentType === 'candlestick';

    // Update Chart Config if needed
    if (chart.config.type !== currentType) {
        chart.config.type = currentType;
    }

    if (isCandle) {
        // Prepare OHLC data
        const ohlcData = data.ohlc.map(item => ({
            x: item.time * 1000,
            o: item.o,
            h: item.h,
            l: item.l,
            c: item.c
        }));

        // Use 'time' scale for candlestick (requires date-fns adapter)
        chart.config.options.scales.x.type = 'time';
        chart.config.options.scales.x.time = {
            unit: 'day', // Auto-adjusts usually, but good to have defaults
            displayFormats: {
                day: 'MM/dd',
                month: 'yyyy/MM'
            }
        };
        // Apply tick limits to prevent overlap
        chart.config.options.scales.x.ticks = {
            source: 'auto',
            autoSkip: true,
            maxTicksLimit: 6,
            maxRotation: 0,
            color: '#8b92a5',
            font: {
                family: "'JetBrains Mono', monospace",
                size: 10
            }
        };
        // Remove labels for time scale to let it handle distribution
        chart.data.labels = [];

        chart.data.datasets = [{
            label: elementIdPrefix === 'search' ? data.name : '',
            data: ohlcData,
            borderColor: '#555', // Wick color
            color: {
                up: '#2ebd85',
                down: '#f6465d',
                unchanged: '#999',
            },
            // financial chart specific options?
            // Actually chartjs-chart-financial uses 'borderColor' for wicks, 
            // and background colors for body usually inferred or set via specific element options.
            // Let's try basic setup first.
        }];

    } else {
        // Line Chart
        // Revert scale to default (using labels)
        delete chart.config.options.scales.x.type;
        delete chart.config.options.scales.x.time;

        chart.data.labels = labels;
        chart.data.datasets = [{
            label: elementIdPrefix === 'search' ? data.name : '',
            data: prices,
            borderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            // Gradient Logic
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, isPositive ? 'rgba(46, 189, 133, 0.2)' : 'rgba(246, 70, 93, 0.2)');
                gradient.addColorStop(1, isPositive ? 'rgba(46, 189, 133, 0)' : 'rgba(246, 70, 93, 0)');
                return gradient;
            }
        }];
    }

    chart.update('none');

    // Update Text Display
    if (elementIdPrefix === 'search') {
        updateSearchPriceDisplay(currentPrice, prevClose);
    } else {
        updatePriceDisplay(elementIdPrefix, currentPrice, prevClose);
    }
}

// Update All
async function updateDashboard() {
    for (const index of indices) {
        await updateIndexData(index);
    }
}

function updatePriceDisplay(id, current, prevClose) {
    const elPrice = document.querySelector(`#${id}-price .current-price`);
    const elChange = document.querySelector(`#${id}-price .change-percent`);

    if (!elPrice || !elChange) return;

    const diff = current - prevClose;
    const percent = (diff / prevClose) * 100;
    const isPositive = diff >= 0;

    elPrice.textContent = current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    elPrice.className = `current-price ${isPositive ? 'text-up' : 'text-down'}`;

    const sign = isPositive ? '+' : '';
    elChange.textContent = `${sign}${percent.toFixed(2)}%`;
    elChange.className = `change-percent ${isPositive ? 'text-up' : 'text-down'}`;
}

function updateSearchPriceDisplay(current, prevClose) {
    const elPrice = document.querySelector(`#search-price-info .current-price`);
    const elChange = document.querySelector(`#search-price-info .change-percent`);

    if (!elPrice || !elChange) return;

    const diff = current - prevClose;
    const percent = (diff / prevClose) * 100;
    const isPositive = diff >= 0;

    elPrice.textContent = current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    elPrice.className = `current-price ${isPositive ? 'text-up' : 'text-down'}`;

    const sign = isPositive ? '+' : '';
    elChange.textContent = `${sign}${percent.toFixed(2)}%`;
    elChange.className = `change-percent ${isPositive ? 'text-up' : 'text-down'}`;
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour12: false });
    document.getElementById('current-time').textContent = timeString;
}

// Search Functionality
let currentSearchSymbol = '';
let currentChartType = 'candlestick'; // Default to candlestick
let lastFetchedData = null; // Store data to avoid re-fetching on toggle
// Tab Switching Logic
function switchTab(tabId) {
    // Update Buttons
    document.querySelectorAll('.tab-nav-btn').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update Content
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Actions
    if (tabId === 'tab-portfolio') {
        renderPortfolioList();
        updatePortfolioPrices();
        // Resize charts if they were hidden
        if (analysisChart) analysisChart.resize();
        if (charts['compositionStart']) charts['compositionStart'].resize();
        if (charts['compositionEnd']) charts['compositionEnd'].resize();
    } else if (tabId === 'tab-recommend') {
        renderRecommendations();
    }
}

// Recommended Portfolios Data
const recommendedPortfolios = [
    {
        id: 'john_burr',
        name: '존버 (John Burr)',
        desc: '10x10% Equal Weight Strategy',
        items: [
            { symbol: 'DLS', weight: 0.10, name: 'WisdomTree Intl SmallCap Div' },
            { symbol: 'EEM', weight: 0.10, name: 'iShares MSCI Emerging Markets' },
            { symbol: 'IJR', weight: 0.10, name: 'iShares Core S&P Small-Cap' },
            { symbol: 'IJS', weight: 0.10, name: 'iShares S&P Small-Cap 600 Value' },
            { symbol: 'SPY', weight: 0.10, name: 'SPDR S&P 500' },
            { symbol: 'VTV', weight: 0.10, name: 'Vanguard Value' },
            { symbol: 'VEA', weight: 0.10, name: 'Vanguard FTSE Developed Markets' },
            { symbol: 'SCZ', weight: 0.10, name: 'iShares MSCI EAFE Small-Cap' },
            { symbol: 'EFV', weight: 0.10, name: 'iShares MSCI EAFE Value' },
            { symbol: 'VNQ', weight: 0.10, name: 'Vanguard Real Estate' }
        ]
    },
    {
        id: 'bill_bernstein',
        name: 'Bill Bernstein',
        desc: 'Diversified Global Allocation',
        items: [
            { symbol: 'VTV', weight: 0.25, name: 'Vanguard Value' },
            { symbol: 'VV', weight: 0.20, name: 'Vanguard Large-Cap' },
            { symbol: 'IJS', weight: 0.15, name: 'iShares S&P Small-Cap 600 Value' },
            { symbol: 'VNQ', weight: 0.10, name: 'Vanguard Real Estate' },
            { symbol: 'EFV', weight: 0.07, name: 'iShares MSCI EAFE Value' },
            { symbol: 'EEM', weight: 0.05, name: 'iShares MSCI Emerging Markets' },
            { symbol: 'IJR', weight: 0.05, name: 'iShares Core S&P Small-Cap' },
            { symbol: 'VGK', weight: 0.05, name: 'Vanguard FTSE Europe' },
            { symbol: 'VPL', weight: 0.05, name: 'Vanguard FTSE Pacific' },
            { symbol: 'GLTR', weight: 0.03, name: 'abrdn Precious Metals Basket' }
        ]
    },
    {
        id: 'odd_stats',
        name: 'Odd Stats',
        desc: 'Diversified Growth & Stability',
        items: [
            { symbol: 'QQQ', weight: 0.22, name: 'Invesco QQQ Trust' },
            { symbol: 'USMV', weight: 0.15, name: 'iShares MSCI USA Min Vol' },
            { symbol: 'VNQ', weight: 0.10, name: 'Vanguard Real Estate' },
            { symbol: 'BNDX', weight: 0.23, name: 'Vanguard Total Intl Bond' },
            { symbol: 'IEF', weight: 0.20, name: 'iShares 7-10 Year Treasury' },
            { symbol: 'GLD', weight: 0.10, name: 'SPDR Gold Trust' }
        ]
    },
    {
        id: 'all_weather',
        name: '올 웨더 (All Weather - Ray Dalio)',
        desc: 'Diversified Risk Parity Strategy',
        items: [
            { symbol: 'VTI', weight: 0.30, name: 'Vanguard Total Stock Market' },
            { symbol: 'TLT', weight: 0.40, name: 'iShares 20+ Year Treasury Bond' },
            { symbol: 'IEI', weight: 0.15, name: 'iShares 3-7 Year Treasury Bond' },
            { symbol: 'DBC', weight: 0.075, name: 'Invesco DB Commodity Index' },
            { symbol: 'GLD', weight: 0.075, name: 'SPDR Gold Trust' }
        ]
    },
    {
        id: 'golden_butterfly',
        name: '황금나비 (Golden Butterfly)',
        desc: '5x20% Balanced Strategy',
        items: [
            { symbol: 'IJS', weight: 0.20, name: 'iShares S&P Small-Cap 600 Value' },
            { symbol: 'VTI', weight: 0.20, name: 'Vanguard Total Stock Market' },
            { symbol: 'SHY', weight: 0.20, name: 'iShares 1-3 Year Treasury Bond' },
            { symbol: 'TLT', weight: 0.20, name: 'iShares 20+ Year Treasury Bond' },
            { symbol: 'GLD', weight: 0.20, name: 'SPDR Gold Trust' }
        ]
    },
    {
        id: 'diavola',
        name: 'Diavola Portfolio',
        desc: 'Fixed Income & Equity Mix',
        items: [
            { symbol: 'VTI', weight: 0.65, name: 'Vanguard Total Stock Market' },
            { symbol: 'QQQ', weight: 0.25, name: 'Invesco QQQ Trust' },
            { symbol: 'BSV', weight: 0.05, name: 'Vanguard Short-Term Bond' },
            { symbol: 'IEI', weight: 0.05, name: 'iShares 3-7 Year Treasury Bond' }
        ]
    },
    {
        id: 'us_world_bond',
        name: 'US, World, Bond',
        desc: 'VTI 55% + VT 25% + BNDX 20%',
        items: [
            { symbol: 'VTI', weight: 0.55, name: 'Vanguard Total Stock Market' },
            { symbol: 'VT', weight: 0.25, name: 'Vanguard Total World Stock' },
            { symbol: 'BNDX', weight: 0.20, name: 'Vanguard Total Intl Bond' }
        ]
    },
    {
        id: 'warren_buffett',
        name: 'Warren Buffett',
        desc: '90% S&P500 (Large Cap) + 10% Bonds',
        items: [
            { symbol: 'VV', weight: 0.90, name: 'Vanguard Large-Cap' },
            { symbol: 'SHY', weight: 0.10, name: 'iShares 1-3 Year Treasury Bond' }
        ]
    },
    {
        id: 'momentum8020',
        name: 'Momentum 80/20',
        desc: 'MTUM 80% + BND 20%',
        items: [
            { symbol: 'MTUM', weight: 0.80, name: 'iShares MSCI USA Momentum Factor' },
            { symbol: 'BND', weight: 0.20, name: 'Vanguard Total Bond Market' }
        ]
    },
    {
        id: 'tech',
        name: 'Technology',
        desc: 'Market Benchmark - Technology',
        items: [
            { symbol: 'QQQ', weight: 1.0, name: 'Invesco QQQ Trust' }
        ]
    },
    {
        id: 'quality',
        name: 'US Quality Stocks',
        desc: 'Market Benchmark',
        items: [
            { symbol: 'QUAL', weight: 1.0, name: 'iShares MSCI USA Quality Factor' }
        ]
    },
    {
        id: 'momentum',
        name: 'US Stocks Momentum',
        desc: 'Market Benchmark',
        items: [
            { symbol: 'MTUM', weight: 1.0, name: 'iShares MSCI USA Momentum Factor' }
        ]
    },
    {
        id: 'sp500eq',
        name: 'S&P500 Equal Weight',
        desc: 'Market Benchmark',
        items: [
            { symbol: 'RSP', weight: 1.0, name: 'Invesco S&P 500 Equal Weight' }
        ]
    },
    {
        id: 'us_total',
        name: 'US Stocks Total',
        desc: 'Market Benchmark',
        items: [
            { symbol: 'VTI', weight: 1.0, name: 'Vanguard Total Stock Market' }
        ]
    },
    {
        id: 'momentum6040',
        name: 'Momentum 60/40',
        desc: 'MTUM 60% + BND 40%',
        items: [
            { symbol: 'MTUM', weight: 0.60, name: 'iShares MSCI USA Momentum Factor' },
            { symbol: 'BND', weight: 0.40, name: 'Vanguard Total Bond Market' }
        ]
    },
    {
        id: 'us7_world3',
        name: 'US 70% / World 30%',
        desc: 'VTI 70% + VT 30%',
        items: [
            { symbol: 'VTI', weight: 0.70, name: 'Vanguard Total Stock Market' },
            { symbol: 'VT', weight: 0.30, name: 'Vanguard Total World Stock' }
        ]
    },
    {
        id: 'low_volatility',
        name: 'Low Volatility Stocks',
        desc: 'Market Benchmark',
        items: [
            { symbol: 'USMV', weight: 1.0, name: 'iShares MSCI USA Min Vol Factor' }
        ]
    },
    {
        id: 'stock8020',
        name: 'Stock 80% / Bond 20%',
        desc: 'VTI 80% + BND 20%',
        items: [
            { symbol: 'VTI', weight: 0.80, name: 'Vanguard Total Stock Market' },
            { symbol: 'BND', weight: 0.20, name: 'Vanguard Total Bond Market' }
        ]
    }
];

// Helper to calculate portfolio metrics dynamically
async function calcPortfolioMetrics(items) {
    // Try ranges: 10y -> 5y -> 3y -> 1y
    const ranges = ['10y', '5y', '3y', '1y'];

    for (const range of ranges) {
        try {
            // Fetch data for all items in this range
            const promises = items.map(item => fetchHistory(item.symbol, range));
            const results = await Promise.all(promises);

            // Check if all fetches validity
            if (results.some(r => !r || !r.timestamp || r.timestamp.length < 10)) {
                continue; // Try next range if data insufficient
            }

            // Align timestamps: find the latest 'start date' among all assets
            let maxStartTime = 0;
            results.forEach(res => {
                if (res.timestamp[0] > maxStartTime) maxStartTime = res.timestamp[0];
            });

            // Filter data to start from maxStartTime
            const processedData = results.map(res => {
                const startIndex = res.timestamp.findIndex(t => t >= maxStartTime);
                return {
                    times: res.timestamp.slice(startIndex),
                    closes: res.indicators.quote[0].close.slice(startIndex)
                };
            });

            // Check if we still have enough data after alignment (e.g. at least 6 months ~ 120 days)
            const minLen = Math.min(...processedData.map(d => d.times.length));
            if (minLen < 120) continue;

            // Calculate Portfolio Value Over Time
            // Assume Initial Investment 100, Buy-and-Hold
            const portfolioValues = [];

            // Normalized Prices (Start = 1.0)
            const normPrices = processedData.map(d => {
                const startPrice = d.closes[0];
                return d.closes.map(p => p / startPrice);
            });

            // Calculate daily portfolio value
            for (let i = 0; i < minLen; i++) {
                let val = 0;
                items.forEach((item, idx) => {
                    val += item.weight * normPrices[idx][i]; // Weight * Normalized Price
                });
                portfolioValues.push(val);
            }

            // CAGR
            const startVal = portfolioValues[0];
            const endVal = portfolioValues[portfolioValues.length - 1];

            // Years duration
            const durationDays = (processedData[0].times[minLen - 1] - processedData[0].times[0]) / (3600 * 24);
            const years = durationDays / 365.25;

            const cagr = (Math.pow(endVal / startVal, 1 / years) - 1) * 100;

            // MDD
            let peak = -Infinity;
            let maxDrawdown = 0;
            portfolioValues.forEach(v => {
                if (v > peak) peak = v;
                const dd = (v - peak) / peak;
                if (dd < maxDrawdown) maxDrawdown = dd;
            });

            return {
                range: range,
                return: cagr.toFixed(2),
                mdd: (maxDrawdown * 100).toFixed(2)
            };

        } catch (e) {
            console.warn(`Failed calc for ${range}`, e);
        }
    }

    return { range: 'N/A', return: '0.00', mdd: '0.00' };
}


// Render Recommendations
let recommendationsRendered = false;
let isRecommendLoading = false;

async function renderRecommendations() {
    if (recommendationsRendered || isRecommendLoading) return;
    isRecommendLoading = true;

    const grid = document.getElementById('recommendation-grid');
    // loading can be started but tab not active.
    // If we clear innerHTML, we might clear something if we are not careful? 
    // But initially it is empty.
    grid.innerHTML = '';

    // Show partial loading
    const tempLoading = document.createElement('div');
    tempLoading.style.gridColumn = "1 / -1";
    tempLoading.style.textAlign = "center";
    tempLoading.innerHTML = "<p>추천 포트폴리오의 현재 가치를 분석중입니다...</p>";
    grid.appendChild(tempLoading);

    try {
        for (const pf of recommendedPortfolios) {
            // Calculate Metrics
            const metrics = await calcPortfolioMetrics(pf.items);

            const card = document.createElement('div');
            card.className = 'recommend-card';

            const rangeLabelMap = { '10y': '10년', '5y': '5년', '3y': '3년', '1y': '1년' };
            const rangeText = rangeLabelMap[metrics.range] || metrics.range;

            card.innerHTML = `
                <div class="recommend-header">
                    <div>
                        <h2>${pf.name}</h2>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${pf.desc}</span>
                    </div>
                </div>
                <div class="recommend-chart-container">
                    <canvas id="rec-chart-${pf.id}"></canvas>
                </div>
                <div class="recommend-metrics">
                    <div class="metric-box">
                        <span class="metric-label">연평균 수익률 (${rangeText})</span>
                        <span class="metric-value text-up">${metrics.return}%</span>
                    </div>
                    <div class="metric-box">
                        <span class="metric-label">MDD (최대낙폭)</span>
                        <span class="metric-value text-down">${metrics.mdd}%</span>
                    </div>
                </div>
                <button class="copy-portfolio-btn" onclick="copyPortfolio('${pf.id}')">이 포트폴리오로 시작하기</button>
            `;
            grid.appendChild(card);

            // Render Chart
            const ctx = document.getElementById(`rec-chart-${pf.id}`).getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: pf.items.map(i => i.symbol),
                    datasets: [{
                        data: pf.items.map(i => i.weight),
                        backgroundColor: [
                            '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#9ca3af', font: { size: 10 }, boxWidth: 10 }
                        }
                    }
                }
            });
        }
        recommendationsRendered = true;
    } catch (e) {
        console.error("Error rendering recommendations:", e);
    } finally {
        if (tempLoading && tempLoading.parentNode) {
            tempLoading.remove();
        }
        isRecommendLoading = false;
    }
}

// Copy Portfolio Logic
async function copyPortfolio(pfId) {
    const pf = recommendedPortfolios.find(p => p.id === pfId);
    if (!pf) return;

    if (!confirm(`'${pf.name}' 포트폴리오를 복사하시겠습니까?\n\n주의: 기존 포트폴리오가 모두 삭제되고, 총 1,000만 원 기준으로 수량이 자동 계산되어 입력됩니다.`)) {
        return;
    }

    // Show Loading
    const loading = document.getElementById('recommend-loading');
    const loadingText = loading.querySelector('p');
    const originalText = loadingText.textContent;

    // Change text for copying
    loadingText.textContent = '포트폴리오 복사 및 계산 중입니다...';

    const grid = document.getElementById('recommendation-grid');
    grid.style.display = 'none';
    loading.style.display = 'block';

    try {
        // Clear Portfolio
        portfolio = {};

        // Investment Amount
        const totalInvestmentKRW = 10000000; // 10 million KRW

        // Fetch Exchange Rate
        await fetchExchangeRate();
        const exchangeRate = currentExchangeRate > 0 ? currentExchangeRate : 1400;

        // Calculate Quantity for each item
        for (const item of pf.items) {
            // Fetch Current Price to calculate quantity
            const data = await fetchStockData(item.symbol, '1d', '1m'); // fast fetch one point
            const priceUSD = data ? data.currentPrice : 0;

            if (priceUSD > 0) {
                // Allocation Amount in KRW
                const allocKRW = totalInvestmentKRW * item.weight;

                // Convert to USD
                const allocUSD = allocKRW / exchangeRate;

                // Quantity
                const qty = allocUSD / priceUSD;

                // Add to Portfolio
                portfolio[item.symbol] = {
                    symbol: item.symbol,
                    name: item.name,
                    currency: 'USD',
                    quantity: parseFloat(qty.toFixed(4)) // Keep decimal for precision
                };
            }
        }

        savePortfolio();

        // Switch to Portfolio Tab
        switchTab('tab-portfolio');

    } catch (e) {
        console.error(e);
        alert('오류가 발생했습니다: ' + e.message);
    } finally {
        loading.style.display = 'none';
        loadingText.textContent = originalText; // Restore text
        grid.style.display = 'grid'; // restore grid for next time
    }
}

// Ensure global scope for button onclick
window.copyPortfolio = copyPortfolio;

async function handleSearch(range = '5y', interval = '1mo', chartType = null) {
    const input = document.getElementById('stock-code');
    const exchangeSelect = document.getElementById('exchange-select');
    const suffix = exchangeSelect.value;

    // Determine symbol to use
    let symbol = input.value.trim().toUpperCase();

    // If input is empty, OR if we are triggered by a button click (implied by range/chartType being set), 
    // we should prefer the already searched symbol if available.
    if (!symbol && currentSearchSymbol) {
        symbol = currentSearchSymbol;
    }

    // Update chart type if provided
    if (chartType) {
        currentChartType = chartType;
    }

    const errorEl = document.getElementById('search-error');
    const resultSection = document.getElementById('search-result-section');

    // Append suffix if selected and not already present logic
    // Logic update: Only append suffix if we are taking value from input fresh.
    // If we are using currentSearchSymbol, it arguably already has suffix.
    // But currentSearchSymbol might be 'AAPL'.

    // Let's refine:
    // 1. If we have a valid currentSearchSymbol and (input is empty or input == currentSearchSymbol without suffix), use current.
    // 2. Otherwise use input and append suffix.

    // Current logic was:
    if (suffix && !symbol.includes('.')) {
        symbol += suffix;
    }

    if (!symbol) return; // Nothing to search

    currentSearchSymbol = symbol; // Store for range updates

    // Reset UI
    errorEl.style.display = 'none';

    const searchBtn = document.getElementById('search-btn');

    // Determine if we need to fetch new data or use cached data
    // Fetch if:
    // 1. No last data
    // 2. Symbol changed
    // 3. Range changed
    // 4. Interval changed
    const shouldFetchNewData = !(lastFetchedData &&
        lastFetchedData.symbol === symbol &&
        lastFetchedData.range === range &&
        lastFetchedData.interval === interval);

    let data = null;

    if (shouldFetchNewData) {
        searchBtn.textContent = '검색 중...';
        searchBtn.disabled = true;
        try {
            data = await fetchStockData(symbol, range, interval);

            if (!data || data.prices.length === 0) {
                throw new Error('데이터를 찾을 수 없습니다.');
            }

            lastFetchedData = { ...data, symbol, range, interval }; // Cache
        } catch (error) {
            errorEl.textContent = '종목을 찾을 수 없거나 데이터를 불러올 수 없습니다. 코드를 확인해주세요.';
            errorEl.style.display = 'block';
            resultSection.style.display = 'none';
            searchBtn.textContent = '검색';
            searchBtn.disabled = false;
            return; // Exit if fetch failed
        } finally {
            searchBtn.textContent = '검색';
            searchBtn.disabled = false;
        }
    } else {
        data = lastFetchedData; // Use cached data
    }


    // Show result section
    resultSection.style.display = 'block';

    // Update Headers
    document.getElementById('search-name').textContent = data.name;
    document.getElementById('search-symbol').textContent = symbol;

    // Init Search Chart if not exists
    if (!charts['searchResult']) {
        const ctx = document.getElementById('searchChart').getContext('2d');
        const config = JSON.parse(JSON.stringify(chartConfig));
        config.options.scales.x.display = true;
        config.data = { labels: [], datasets: [] };
        charts['searchResult'] = new Chart(ctx, config);
    }

    // Update Chart and Price
    updateChartUI(charts['searchResult'], data, 'search', true, currentChartType);

    // Update Portfolio Button State
    updatePortfolioButton(symbol);
}

// General Chart Update Handler
async function handleChartUpdate(chartId, range, interval, type) {
    // Find the state object or handle search result
    let targetState = null;
    let symbol = '';

    if (chartId === 'search') {
        // Search result handling: If range is not provided (type toggle), use existing
        const nextRange = range || (lastFetchedData ? lastFetchedData.range : undefined);
        const nextInterval = interval || (lastFetchedData ? lastFetchedData.interval : undefined);
        handleSearch(nextRange, nextInterval, type);
        return;
    } else {
        targetState = indices.find(i => i.id === chartId);
        if (targetState) {
            // Update state
            if (range) {
                targetState.range = range;
                targetState.interval = interval;
            }
            if (type) {
                targetState.type = type;
            }
            symbol = targetState.symbol;
        } else {
            return;
        }
    }

    // Identify UI elements
    const wrapper = document.querySelector(`.chart-controls-wrapper[data-index-id="${chartId}"]`);
    if (!wrapper) return; // Should exist

    // Fetch and Update
    // Show some loading state? Maybe optional for dashboard items to avoid flicker overload
    // But good UI practice.

    // For dashboard items, reuse cache if only type changed
    let data;
    if (range) {
        // Range changed, fetch new data
        data = await fetchStockData(symbol, targetState.range, targetState.interval);
        if (data) targetState.lastData = data;
    } else if (targetState.lastData) {
        // Only type changed, use cached data
        data = targetState.lastData;
    } else {
        // Fallback (e.g. first load if not ready)
        data = await fetchStockData(symbol, targetState.range, targetState.interval);
        if (data) targetState.lastData = data;
    }

    if (data && charts[chartId]) {
        updateChartUI(charts[chartId], data, chartId, true, targetState.type);
    }
}


// Portfolio State
let portfolio = {};

// Load and Migrate
try {
    const saved = JSON.parse(localStorage.getItem('myPortfolio'));
    if (saved) {
        if (Array.isArray(saved)) {
            // Migrate Array to Object
            saved.forEach(item => {
                portfolio[item.symbol] = item;
            });
            savePortfolio();
        } else {
            portfolio = saved;
        }
    }
} catch (e) {
    console.error('Failed to load portfolio', e);
    portfolio = {};
}

// Save Portfolio
function savePortfolio() {
    localStorage.setItem('myPortfolio', JSON.stringify(portfolio));
}

// Add to Portfolio
function addToPortfolio(data) {
    if (portfolio[data.symbol]) {
        alert('이미 포트폴리오에 있는 종목입니다.');
        return;
    }

    portfolio[data.symbol] = {
        symbol: data.symbol,
        name: data.name,
        currency: 'USD',
        quantity: 1
    };
    savePortfolio();
    renderPortfolioList();
    updatePortfolioButton(data.symbol);
}

// Remove from Portfolio
function removeFromPortfolio(symbol) {
    if (portfolio[symbol]) {
        delete portfolio[symbol];
        savePortfolio();
        renderPortfolioList();
        updatePortfolioButton(symbol);
    } else {
        alert('포트폴리오에서 항목을 찾을 수 없습니다.');
    }
}

// Update Portfolio Button UI
function updatePortfolioButton(symbol) {
    const btn = document.getElementById('add-to-portfolio-btn');
    if (!btn) return;

    if (!lastFetchedData || lastFetchedData.symbol !== symbol) return;

    // O(1) Check
    if (portfolio[symbol]) {
        btn.textContent = '포트폴리오에서 삭제';
        btn.classList.add('remove');
    } else {
        btn.textContent = '포트폴리오에 담기';
        btn.classList.remove('remove');
    }
}

// Render Portfolio List
function renderPortfolioList() {
    const list = document.getElementById('portfolio-list');
    list.innerHTML = '';

    const items = Object.values(portfolio);

    if (items.length === 0) {
        list.innerHTML = '<div style="text-align:center; color: var(--text-secondary); padding: 20px;">포트폴리오가 비어있습니다.</div>';
        return;
    }

    // Sort by Symbol for consistency since Object order is not guaranteed
    items.sort((a, b) => a.symbol.localeCompare(b.symbol));

    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'portfolio-item';
        div.dataset.symbol = item.symbol;
        div.dataset.price = 0;
        div.dataset.exchange = 1;

        div.innerHTML = `
            <div class="item-info">
                <span class="item-symbol">${item.symbol}</span>
                <span class="item-name">${item.name}</span>
            </div>
            <div class="item-controls">
                <span class="item-total">-- 원</span>
                <input type="number" class="qty-input" value="${item.quantity}" min="0.0001" step="any" data-symbol="${item.symbol}">
                <button class="delete-btn" data-symbol="${item.symbol}">삭제</button>
            </div>
        `;
        list.appendChild(div);
    });

    // Add Listeners
    list.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const sym = e.target.dataset.symbol;
            const val = parseFloat(e.target.value);
            if (val >= 0 && portfolio[sym]) {
                portfolio[sym].quantity = val;
                savePortfolio();

                const row = e.target.closest('.portfolio-item');
                updateItemTotal(row);
            }
        });
    });

    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sym = e.currentTarget.dataset.symbol;
            if (confirm(`정말 ${sym} 종목을 삭제하시겠습니까?`)) {
                removeFromPortfolio(sym);
            }
        });
    });
}

function updateItemTotal(row) {
    const qtyInput = row.querySelector('.qty-input');
    const totalEl = row.querySelector('.item-total');
    const price = parseFloat(row.dataset.price) || 0;
    const exchange = parseFloat(row.dataset.exchange) || 1;
    const qty = parseFloat(qtyInput.value) || 0;

    // Logic: 
    // If KRW stock (.KS, .KQ), price is in KRW.
    // If USD stock, price is USD, need conversion.
    // The dataset.exchange should be set to 1 for KRW stocks or the rate for USD stocks.

    // Actually, let's handle the specific logic in updatePortfolioPrices and just store the *multiplier* in dataset.exchange?
    // Or store raw price and raw exchange and decide logic here?
    // Let's decide logic here requires knowing if it's KRW or USD.
    // Symbol is in dataset.symbol.

    const symbol = row.dataset.symbol;
    const isKRW = symbol.endsWith('.KS') || symbol.endsWith('.KQ');

    let finalValue = 0;
    if (isKRW) {
        finalValue = price * qty;
    } else {
        finalValue = price * exchange * qty;
    }

    if (price === 0) {
        totalEl.textContent = '-- 원';
        return;
    }

    // Format: 1,234,560 원
    totalEl.textContent = `${Math.floor(finalValue).toLocaleString()} 원`;
}


// Exchange Rate State
let currentExchangeRate = 1400; // Default fallback

async function fetchExchangeRate() {
    try {
        const exchangeData = await fetchStockData('KRW=X', '5d', '1d');
        if (exchangeData && exchangeData.currentPrice) {
            currentExchangeRate = exchangeData.currentPrice;
            console.log('Exchange Rate Updated:', currentExchangeRate);
        }
    } catch (e) {
        console.error('Failed to fetch exchange rate:', e);
    }
}

// Update Portfolio Prices (Fetches Data)
// Update Portfolio Prices (Fetches Data)
async function updatePortfolioPrices() {
    if (Object.keys(portfolio).length === 0) return;

    // Exchange rate is already fetched via fetchExchangeRate() on load.

    const rows = document.querySelectorAll('.portfolio-item');
    for (const row of rows) {
        const symbol = row.dataset.symbol;
        const totalEl = row.querySelector('.item-total');

        if (totalEl.textContent === '-- 원') {
            totalEl.textContent = '로딩...';
            totalEl.style.fontSize = '0.8rem';
        }

        // 1. Check Cloud Cache First
        if (cloudCache.stocks[symbol]) {
            const cached = cloudCache.stocks[symbol];
            row.dataset.price = cached.currentPrice;
            row.dataset.exchange = currentExchangeRate; // Use current rate
            updateItemTotal(row);
            totalEl.style.fontSize = '';
            // Indicate stale data? Maybe color grey?
        }

        try {
            // 2. Fetch Fresh
            let data = null;
            if (lastFetchedData && lastFetchedData.symbol === symbol) {
                data = lastFetchedData;
            }

            if (!data) {
                data = await fetchStockData(symbol, '5d', '15m');
            }

            if (data) {
                // 3. Update Cache & Save
                cloudCache.stocks[symbol] = data;
                saveToDrive();

                row.dataset.price = data.currentPrice;
                row.dataset.exchange = currentExchangeRate;
                totalEl.style.fontSize = '';
                updateItemTotal(row);
            } else {
                if (!cloudCache.stocks[symbol]) totalEl.textContent = '데이터 없음';
            }
        } catch (e) {
            console.error(`Failed to update price for ${symbol}`, e);
            if (!cloudCache.stocks[symbol]) totalEl.textContent = '에러';
        }
    }
}

// Analysis Logic
let analysisChart = null;

// Fetch Historical Data Helper


async function analyzePortfolio(range = '5y') {
    const items = Object.values(portfolio);
    if (items.length === 0) {
        alert('분석할 종목이 없습니다.');
        return;
    }

    // UI State
    const loadingEl = document.getElementById('portfolio-loading');
    loadingEl.style.display = 'block';
    loadingEl.textContent = `분석 데이터 로딩 중... (0/${items.length})`;
    document.getElementById('portfolio-chart-container').style.display = 'none';
    document.getElementById('portfolio-stats').style.display = 'none';
    document.getElementById('portfolio-composition').style.display = 'none';

    try {
        // 1. Fetch Exchange Rate (High priority)
        const exchangeDataRaw = await fetchHistory('KRW=X', range);
        if (!exchangeDataRaw) throw new Error('환율 정보를 불러올 수 없습니다.');

        // 2. Fetch all stocks with Progress
        let completedCount = 0;
        const updateProgress = () => {
            completedCount++;
            loadingEl.textContent = `분석 데이터 로딩 중... (${completedCount}/${items.length})`;
        };

        const stockPromises = items.map(async item => {
            const res = await fetchHistory(item.symbol, range);
            updateProgress();
            return res;
        });

        const stockResultsRaw = await Promise.all(stockPromises);

        // 3. Process Data
        // ... rest of logic ...

        // Normalize Exchange Data Map: Date(YYYY-MM-DD) -> Close
        // Since intervals might differ (trading days), we'll use a Map keyed by date string for easy lookup.
        // actually using timestamp buckets.

        const timeMap = new Map(); // timestamp -> { exchange: val, stocks: { symbol: price } }

        // Helper to get date string key (YYYY-MM-DD) or just use nearest timestamp alignment?
        // Line chart needs ordered labels.
        // Let's use the timestamps from the first successful stock or exchange.
        // Actually, exchange rate trades constantly? No, forex also has 5 days but different holidays.
        // Common Strategy: Iterate through all distinct sorted timestamps from all datasets.

        // Collect all timestamps
        const allTimestamps = new Set([...exchangeDataRaw.timestamp]);
        stockResultsRaw.forEach(res => {
            if (res && res.timestamp) res.timestamp.forEach(t => allTimestamps.add(t));
        });

        const sortedTimes = Array.from(allTimestamps).sort((a, b) => a - b);

        // Create Lookups
        // Function to create lookup map for a connection
        const createLookup = (res) => {
            if (!res || !res.timestamp) return new Map();
            const map = new Map();
            const closes = res.indicators.quote[0].close;
            res.timestamp.forEach((t, i) => {
                map.set(t, closes[i]);
            });
            return map;
        };

        const exchangeLookup = createLookup(exchangeDataRaw);
        const stockLookups = stockResultsRaw.map(res => createLookup(res));

        // Note: Exact timestamp match is rare across different markets (indices vs stocks vs forex).
        // Timestamps are often market close times.
        // Better approach: Normalize to "YYYY-MM-DD".

        const dateToExchange = new Map();
        const ymd = (t) => {
            const d = new Date(t * 1000);
            return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        };

        exchangeDataRaw.timestamp.forEach((t, i) => {
            dateToExchange.set(ymd(t), exchangeDataRaw.indicators.quote[0].close[i]);
        });

        const dateToStocks = stockResultsRaw.map(res => {
            if (!res) return new Map();
            const map = new Map();
            res.timestamp.forEach((t, i) => {
                map.set(ymd(t), res.indicators.quote[0].close[i]);
            });
            return map;
        });

        // Generate Master Date List (Union of all dates)
        // Then sort
        const details = [];
        const allDatesSet = new Set();
        exchangeDataRaw.timestamp.forEach(t => allDatesSet.add(ymd(t)));
        stockResultsRaw.forEach(res => {
            if (res) res.timestamp.forEach(t => allDatesSet.add(ymd(t)));
        });

        // Original Sorted Union Dates
        let fullSortedDates = Array.from(allDatesSet).sort();

        // [Mod] Filter to Common Start Date (Logic to fix "Starts at 0")
        // Find the LATEST start date among all assets
        let maxStartTimestamp = 0;
        stockResultsRaw.forEach(res => {
            if (res && res.timestamp && res.timestamp.length > 0) {
                if (res.timestamp[0] > maxStartTimestamp) maxStartTimestamp = res.timestamp[0];
            }
        });

        // Convert to YYYY-MM-DD
        const commonStartDate = ymd(maxStartTimestamp);

        // Filter dates to only include those after commonStartDate
        const sortedDates = fullSortedDates.filter(d => d >= commonStartDate);

        // 4. Calculate Portfolio Value
        const portfolioValues = [];
        const chartLabels = [];

        // Forward fill helpers
        let lastExchange = exchangeDataRaw.indicators.quote[0].close[0] || 1200; // Default fallback
        const lastPrices = new Array(items.length).fill(0);

        sortedDates.forEach(date => {
            // Update Exchange
            if (dateToExchange.has(date) && dateToExchange.get(date) !== null) {
                lastExchange = dateToExchange.get(date);
            }

            let dailyTotal = 0;

            items.forEach((item, idx) => {
                const priceMap = dateToStocks[idx];
                let price = 0;

                // Check if we have a price for this date
                if (priceMap.has(date) && priceMap.get(date) !== null) {
                    price = priceMap.get(date);
                    lastPrices[idx] = price;
                } else {
                    price = lastPrices[idx];
                }

                // Currency Conversion
                const isKRW = item.symbol.endsWith('.KS') || item.symbol.endsWith('.KQ');
                let valueInKRW = 0;

                if (isKRW) {
                    valueInKRW = price * item.quantity;
                } else {
                    valueInKRW = price * item.quantity * lastExchange;
                }

                dailyTotal += valueInKRW;
            });

            portfolioValues.push(dailyTotal);
            chartLabels.push(date);
        });

        // --- Performance Metrics Calculation ---
        const initialValue = portfolioValues[0];
        const finalValue = portfolioValues[portfolioValues.length - 1];

        // 1. Total Return
        const totalReturn = ((finalValue - initialValue) / initialValue) * 100;

        // 2. CAGR (Compound Annual Growth Rate)
        // Heuristic mapping for years based on range string
        const rangeMap = {
            '10y': 10, '7y': 7, '5y': 5, '3y': 3, '1y': 1, '6mo': 0.5
        };
        const years = rangeMap[range] || 5;

        let cagr = 0;
        if (initialValue > 0 && finalValue > 0) {
            cagr = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
        }

        // 3. MDD (Maximum Drawdown)
        let peak = -Infinity;
        let maxDrawdown = 0;

        portfolioValues.forEach(val => {
            if (val > peak) peak = val;
            const drawdown = (val - peak) / peak;
            if (drawdown < maxDrawdown) maxDrawdown = drawdown;
        });

        // Update Stats UI
        const returnEl = document.getElementById('stat-return');
        const cagrEl = document.getElementById('stat-cagr');
        const mddEl = document.getElementById('stat-mdd');

        // Comments Elements
        const returnCommentEl = document.getElementById('comment-return');
        const cagrCommentEl = document.getElementById('comment-cagr');
        const mddCommentEl = document.getElementById('comment-mdd');

        const formatStat = (el, val) => {
            el.textContent = `${val.toFixed(2)}%`;
            el.className = 'stat-value'; // reset
            if (val > 0) el.classList.add('positive');
            if (val < 0) el.classList.add('negative');
        };

        formatStat(returnEl, totalReturn);
        formatStat(cagrEl, cagr);

        // MDD is usually displayed as negative, but some prefer abs. Standard is negative.
        mddEl.textContent = `${(maxDrawdown * 100).toFixed(2)}%`;
        mddEl.className = 'stat-value negative'; // Always bad or neutral

        // --- Metric Comments ---
        const rangeTextMap = { '10y': '10년', '7y': '7년', '5y': '5년', '3y': '3년', '1y': '1년', '6mo': '6개월' };
        const rangeText = rangeTextMap[range] || '기간';

        // 1. Return Comment (10m KRW scenario)
        const investment = 1000; // 1000 man-won
        const profit = investment * (totalReturn / 100);
        const finalMoney = investment + profit;
        returnCommentEl.textContent = `수익분석: ${rangeText} 전에 이 포트폴리오로\n1,000만 원 투자했다면 ${Math.floor(finalMoney).toLocaleString()}만 원을 벌 수 있어요!`;

        // 2. CAGR Comment
        cagrCommentEl.textContent = `연 평균 ${cagr.toFixed(2)}% 수익을\n기대할 수 있어요!`;

        // 3. MDD Comment
        mddCommentEl.textContent = `최대 ${(maxDrawdown * 100).toFixed(2)}% 하락을\n감수해야 했어요!`;


        document.getElementById('portfolio-stats').style.display = 'flex';

        // --- Composition Pie Charts ---
        // Need Value per Stock at Start (t=0) and End (t=last)
        // quantity assumed constant over period as per current simplified logic

        const startValues = items.map((item, idx) => {
            let price = 0;
            // Find first valid price
            const priceMap = dateToStocks[idx];
            for (let i = 0; i < sortedDates.length; i++) {
                if (priceMap.has(sortedDates[i]) && priceMap.get(sortedDates[i]) !== null) {
                    price = priceMap.get(sortedDates[i]);
                    break;
                }
            }
            // If no price found, usage 0?? Or current price?
            // If stock listed later, start value is 0. This is correct representation.

            // Exchange rate at start
            // We need exchange rate matching that date.
            // Simplified: use exchange at t=0 of portfolio (or first valid date)
            // Ideally we need exchange rate at that specific date.

            // Let's reuse logic from main loop or just fetch from map.
            // For pie chart, rough Start value is fine.

            // Re-calculate simply:
            const firstDate = sortedDates[0];
            let initialExchange = 1200;
            if (dateToExchange.has(firstDate)) initialExchange = dateToExchange.get(firstDate);

            const isKRW = item.symbol.endsWith('.KS') || item.symbol.endsWith('.KQ');
            let val = 0;
            if (priceMap.has(firstDate)) {
                val = priceMap.get(firstDate) * item.quantity;
                if (!isKRW) val *= initialExchange;
            }
            return { label: item.name, value: val };
        });

        const endValues = items.map((item, idx) => {
            // Use the final forward-filled price from the main loop
            const price = lastPrices[idx];
            const isKRW = item.symbol.endsWith('.KS') || item.symbol.endsWith('.KQ');

            let val = 0;
            if (price > 0) {
                val = price * item.quantity;
                if (!isKRW) val *= lastExchange;
            }
            return { label: item.name, value: val };
        });

        // Helper to render Donut Chart
        const renderPie = (canvasId, data, chartIdKey, referenceTotal = null) => {
            // Destroy existing
            if (charts[chartIdKey]) {
                charts[chartIdKey].destroy();
            }

            const ctx = document.getElementById(canvasId).getContext('2d');
            const total = data.reduce((sum, item) => sum + item.value, 0);

            // Format Total for Center Text
            const totalText = `${Math.floor(total / 10000).toLocaleString()}만`;

            // Filter 0 values
            const validData = data.filter(d => d.value > 0);

            const config = {
                type: 'doughnut',
                data: {
                    labels: validData.map(d => d.label),
                    datasets: [{
                        data: validData.map(d => d.value),
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                            '#E7E9ED', '#76A346', '#CD5C5C', '#1E90FF', '#DAA520'
                        ],
                        borderWidth: 0,
                        cutout: '60%'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#9ca3af', font: { size: 11 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const val = context.raw;
                                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
                                    return `${context.label}: ${pct}`;
                                }
                            }
                        }
                    }
                },
                plugins: [{
                    id: 'textCenter',
                    beforeDraw: function (chart) {
                        const width = chart.width,
                            height = chart.height,
                            ctx = chart.ctx;

                        const { top, left, width: chartWidth, height: chartHeight } = chart.chartArea;
                        const centerX = left + chartWidth / 2;
                        const centerY = top + chartHeight / 2;

                        ctx.restore();
                        // Drastically reduced font size (div 300)
                        const fontSize = (height / 300).toFixed(2);
                        ctx.font = `bold ${fontSize}em sans-serif`;
                        ctx.textBaseline = "middle";

                        // Color logic
                        if (referenceTotal !== null) {
                            if (total > referenceTotal) ctx.fillStyle = "#ff5f5f";
                            else if (total < referenceTotal) ctx.fillStyle = "#4694f5";
                            else ctx.fillStyle = "#ffffff";
                        } else {
                            ctx.fillStyle = "#ffffff";
                        }

                        const text = totalText,
                            textX = Math.round(centerX - ctx.measureText(text).width / 2),
                            textY = centerY;

                        ctx.fillText(text, textX, textY);

                        ctx.font = `normal ${(height / 450).toFixed(2)}em sans-serif`;
                        const subText = '원';
                        const subX = Math.round(centerX - ctx.measureText(subText).width / 2);
                        ctx.fillStyle = "#9ca3af";
                        ctx.fillText(subText, subX, textY + 20); // Slightly below center

                        ctx.save();
                    }
                }]
            };
            charts[chartIdKey] = new Chart(ctx, config);
        };

        document.getElementById('portfolio-composition').style.display = 'flex';
        renderPie('compositionStart', startValues, 'pieStart');
        renderPie('compositionEnd', endValues, 'pieEnd');

        // ---------------------------------------

        // 5. Render Chart
        renderAnalysisChart(chartLabels, portfolioValues);

    } catch (error) {
        console.error(error);
        alert('분석 중 오류가 발생했습니다: ' + error.message);
    } finally {
        document.getElementById('portfolio-loading').style.display = 'none';
        document.getElementById('portfolio-chart-container').style.display = 'block';
    }
}

function renderAnalysisChart(labels, data) {
    const ctx = document.getElementById('portfolioChart').getContext('2d');

    if (analysisChart) {
        analysisChart.destroy();
    }

    analysisChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '내 포트폴리오 가치 (KRW)',
                data: data,
                borderColor: '#3b82f6', // distinct blue
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#fff' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#8b92a5',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    position: 'right',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#8b92a5',
                        callback: function (value) {
                            return (value / 10000).toLocaleString() + '만';
                        }
                    }
                }
            },
            animation: { duration: 0 }
        }
    });

    // Update Analysis Summary Text ? (Optional)
    // Maybe show current total value
}


// Start
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateTime(); // Ensure global usage if needed
    fetchExchangeRate(); // optimizations: Fetch once on load

    // Event Listeners for Search Button/Enter
    document.getElementById('search-btn').addEventListener('click', () => handleSearch('5y', '1mo'));
    document.getElementById('add-to-portfolio-btn').addEventListener('click', () => {
        if (!lastFetchedData) {
            alert('데이터를 먼저 검색해주세요.');
            return;
        }

        const symbol = lastFetchedData.symbol;
        const exists = !!portfolio[symbol];

        if (exists) {
            if (confirm('정말 포트폴리오에서 삭제하시겠습니까?')) {
                removeFromPortfolio(symbol);
            }
        } else {
            addToPortfolio(lastFetchedData);
        }
    });
    document.getElementById('stock-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch('5y', '1mo');
    });

    // Portfolio Event Listeners
    // Tab Event Listeners
    document.querySelectorAll('.tab-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Initialize Default Tab
    switchTab('tab-search');

    // Pre-load recommendations
    renderRecommendations();

    const analyzeBtn = document.getElementById('analyze-portfolio-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            document.getElementById('analysis-controls').style.display = 'flex';
            analyzePortfolio('5y');
        });
    }

    document.querySelectorAll('.range-btn-analysis').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.range-btn-analysis').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            analyzePortfolio(e.target.dataset.range);
        });
    });

    // Delegated Event Listeners for All Chart Controls
    document.body.addEventListener('click', (e) => {
        // Range Buttons
        if (e.target.classList.contains('range-btn')) {
            const btn = e.target;
            const wrapper = btn.closest('.chart-controls-wrapper');
            if (!wrapper) return;

            // Visual Update
            const siblings = wrapper.querySelectorAll('.range-btn');
            siblings.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Data Update
            const range = btn.dataset.range;
            const interval = btn.dataset.interval;
            const indexId = wrapper.dataset.indexId || 'search'; // Default to search if not spec

            // For Search Result, we need to pass current type as well or handle it inside handleSearch
            // The handleChartUpdate function logic above handles "search" special case

            // But wait, the search result wrapper doesn't have data-index-id in HTML?
            // We should add data-index-id="search" to the search wrapper in HTML or infer it.
            // Let's assume we update HTML or handle empty dataset.indexId as 'search' logic?
            // Actually, best to handle 'search' specifically.
            // In the HTML update step, I didn't add data-index-id="search" to the search section wrapper.
            // I should verify that or handle it robustly.
            // The search section wrapper is `.chart-controls-wrapper` inside `#search-result-section`.

            let id = wrapper.dataset.indexId;
            if (!id && wrapper.closest('#search-result-section')) {
                id = 'search';
            }

            handleChartUpdate(id, range, interval, null); // type null = keep current
        }

        // Type Buttons
        if (e.target.classList.contains('type-btn')) {
            const btn = e.target;
            const wrapper = btn.closest('.chart-controls-wrapper');
            if (!wrapper) return;

            // Visual Update
            const siblings = wrapper.querySelectorAll('.type-btn');
            siblings.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const type = btn.dataset.type;

            let id = wrapper.dataset.indexId;
            if (!id && wrapper.closest('#search-result-section')) {
                id = 'search';
            }

            handleChartUpdate(id, null, null, type);
        }
    });

    // Updates
    setInterval(updateDashboard, 60000); // 60s
    setInterval(updateTime, 1000); // 1s
});


// --- Login & Drive API Logic (via GAS Proxy) ---
let tokenClient;
let accessToken = null;
const GAS_URL = "https://script.google.com/macros/s/AKfycbz3gyhgRHkWMfhWXcHSxwbCpu8bJkV0TlyQtfW-DdyTzvK2VK7cyFEDaXLdZafF4Cq-/exec";

// --- GAS Helper Functions ---
// --- GAS Helper Functions ---
async function gasFetch(action, { method = "GET", body = null, token } = {}) {
    // Avoid CORS Preflight by sending token in URL and using simple Content-Type
    const validToken = token || accessToken;
    const url = `${GAS_URL}?action=${encodeURIComponent(action)}&access_token=${encodeURIComponent(validToken)}`;

    const options = {
        method: method,
        // redirect: "follow" // Optional
    };

    if (method === "POST" && body) {
        // Send as text/plain (default) to bypass Preflight (OPTIONS)
        options.body = JSON.stringify(body);
        // Do NOT add 'Content-Type: application/json' header
    }

    const res = await fetch(url, options);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "GAS error");
    return json;
}

// 1) First Init
async function dbInit() {
    return gasFetch("init", { token: accessToken });
}

// 2) Read All
async function dbGet() {
    const out = await gasFetch("get", { token: accessToken });
    console.log("[dbGet] Raw GAS Response:", out); // DEBUG
    // The GAS script returns: { ok: true, data: { _schema: ..., data: { portfolio... } } }
    // We want the inner data object
    return out.data && out.data.data ? out.data.data : {};
}


// --- Global Cache for Drive Sync ---
let cloudCache = {
    portfolio: {},
    indices: {},
    stocks: {}
};

// ... (GAS Helper Functions) ...

// 3) Upsert / Set
async function dbSet(fullData) {
    // We save the entire cloudCache object
    return gasFetch("set", {
        method: "POST",
        body: { data: fullData },
        token: accessToken
    });
}


// --- Sync Logic ---
async function syncDataFromDrive() {
    try {
        console.log("Initializing DB...");
        await dbInit(); // Ensure file exists

        console.log("Fetching Data...");
        const cloudData = await dbGet();
        console.log("[syncDataFromDrive] Parsed Cloud Data:", cloudData); // DEBUG

        if (cloudData && (cloudData.portfolio || cloudData.indices || cloudData.stocks)) {
            console.log("Cloud Data Found:", cloudData);

            // Validate & Merge
            cloudCache.portfolio = cloudData.portfolio || {};
            cloudCache.indices = cloudData.indices || {};
            cloudCache.stocks = cloudData.stocks || {};

            // Set App State
            portfolio = cloudCache.portfolio;

            // Render Initial State from Cache
            renderPortfolioList();

            // We can also trigger UI updates for Indices/Stocks if cache exists
            // This will be handled by the specific update functions checking the cache

            alert('구글 드라이브(AppData)에서 데이터를 불러왔습니다.');

            // Trigger background updates?
            // The main logic usually calls updateDashboard() etc on load anyway.
        } else {
            console.log("No cloud data (or empty). Saving local data...");
            // Init Cloud with current local state
            cloudCache.portfolio = portfolio;
            await dbSet(cloudCache);
        }
    } catch (e) {
        console.error("Sync Error:", e);
        alert("동기화 중 오류가 발생했습니다: " + e.message);
    }
}

let saveTimeout = null;
async function saveToDrive() {
    if (!accessToken) return;

    // Debounce save
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        try {
            // Update cache with current app state before saving
            cloudCache.portfolio = portfolio;

            await dbSet(cloudCache);
            console.log('Saved to Drive (GAS):', cloudCache);
        } catch (e) {
            console.error("Save Error:", e);
        }
    }, 2000); // 2 second debounce
}



// --- Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // ... Existing Login Listeners ...
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // VIP Button Listener
    const vipBtn = document.getElementById('vip-btn');
    if (vipBtn) {
        vipBtn.addEventListener('click', () => {
            alert("다수의 포트폴리오 동시 분석은 VIP 회원에게만 개방되는 기능입니다.");
        });
    }

    if (loginBtn && loginModal) {


        loginBtn.addEventListener('click', () => {
            const storedSession = localStorage.getItem('user_session');
            if (storedSession) {
                // User is logged in, confirm logout
                if (confirm("로그아웃 하시겠습니까?")) {
                    localStorage.removeItem('user_session');
                    location.reload(); // Reload to reset state
                }
            } else {
                // Not logged in, show login modal
                loginModal.style.display = 'flex';
            }
        });

    }

    if (closeModalBtn && loginModal) {
        closeModalBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });

    // --- Google Auth ---
    // PLACEHOLDER ID - REPLACE THIS
    const YOUR_GOOGLE_CLIENT_ID = '689145809102-j2ren1qp84qjr3r9hqtahocs1qb91nhd.apps.googleusercontent.com';


    // --- Session & UI Logic ---
    function updateProfileUI(name, picture) {
        // Show Name and Picture
        loginModal.style.display = 'none';

        // If picture exists, show it. Otherwise just name.
        if (picture) {
            loginBtn.innerHTML = `<img src="${picture}" class="profile-img" alt="Profile"> <span>${name}</span>`;
        } else {
            loginBtn.textContent = name;
        }
    }

    function checkUserSession() {
        const storedSession = localStorage.getItem('user_session');
        if (storedSession) {
            try {
                const session = JSON.parse(storedSession);
                console.log("Restoring session for:", session.name);
                updateProfileUI(session.name, session.picture);
                // Note: Access Token is not stored (security & expiry). 
                // User might need to click again to Sync if token is expired/missing, 
                // but visual state is preserved.
            } catch (e) {
                console.error("Session parse error", e);
                localStorage.removeItem('user_session');
            }
        }
    }

    window.handleCredentialResponse = function (response) {
        // Decode User Info
        try {
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join('')));

            console.log("User Logged In: ", payload.name);

            // Save Session
            const sessionData = {
                name: payload.name,
                picture: payload.picture,
                email: payload.email,
                sub: payload.sub // Google ID
            };
            localStorage.setItem('user_session', JSON.stringify(sessionData));

            // Update UI
            updateProfileUI(payload.name, payload.picture);

            // Request Access Token for Drive AppData Scope
            if (tokenClient) {
                // If we are logging in afresh, request token to sync
                tokenClient.requestAccessToken();
            }

        } catch (e) {
            console.error("Error decoding token", e);
        }
    };

    const checkGoogleInterval = setInterval(() => {
        if (typeof google !== 'undefined') {
            clearInterval(checkGoogleInterval);

            // 1. Initialize Sign In
            google.accounts.id.initialize({
                client_id: YOUR_GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                auto_select: false, // user preference?
                cancel_on_tap_outside: true
            });

            google.accounts.id.renderButton(
                document.getElementById("google-signin-button"),
                { theme: "outline", size: "large", width: "250" }
            );

            // 2. Initialize Token Client
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: YOUR_GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.appdata',
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        accessToken = tokenResponse.access_token;
                        console.log('Access Token granted');

                        // Sync Data immediately after login/grant
                        await syncDataFromDrive();
                    }
                },
            });

            // 3. Restore Session AFTER Google is ready (or immediately)
            checkUserSession();
        }
    }, 500);
});

