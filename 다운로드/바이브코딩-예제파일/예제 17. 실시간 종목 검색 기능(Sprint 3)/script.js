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
async function fetchStockData(symbol, range = '1d', interval = '5m', retries = 1) {
    for (let i = 0; i <= retries; i++) {
        try {
            const encodedUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
            const response = await fetch(`https://api.allorigins.win/raw?url=${encodedUrl}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const result = data.chart.result[0];

            const timestamps = result.timestamp || [];
            const quotes = result.indicators.quote[0];

            const opens = quotes.open || [];
            const highs = quotes.high || [];
            const lows = quotes.low || [];
            const closes = quotes.close || [];

            // Filter out null values
            const validData = timestamps.map((t, i) => ({
                time: t, // Keep seconds for calculation
                o: opens[i],
                h: highs[i],
                l: lows[i],
                c: closes[i]
            })).filter(item => item.c !== null && item.o !== null); // Basic validation

            const regularMarketPrice = result.meta.regularMarketPrice;
            const chartPreviousClose = result.meta.chartPreviousClose;

            // Get Stock Name
            const stockName = result.meta.shortName || result.meta.longName || symbol;

            return {
                ohlc: validData,
                prices: validData.map(item => item.c), // Keep simple prices for line chart
                timestamps: validData.map(item => item.time),
                currentPrice: regularMarketPrice,
                prevClose: chartPreviousClose,
                lastUpdated: validData.length > 0 ? validData[validData.length - 1].time : null,
                name: stockName,
            };
        } catch (error) {
            if (i === retries) {
                console.error(`Error fetching data for ${symbol}:`, error);
                return null;
            }
            await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
        }
    }
}

// Initialize Charts
async function initCharts() {
    for (const index of indices) {
        const ctx = document.getElementById(`${index.id}Chart`).getContext('2d');

        // Initial empty chart
        const config = JSON.parse(JSON.stringify(chartConfig));
        // Main dashboard charts should show X-axis now that they have controls
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

        // Load initial data
        await updateIndexData(index);
    }
}

// Update Single Index Data
async function updateIndexData(index) {
    const data = await fetchStockData(index.symbol, index.range, index.interval);
    if (!data) return;

    index.lastData = data; // Cache data for type toggling

    const chart = charts[index.id];
    updateChartUI(chart, data, index.id, true, index.type); // id, showTimes=true, type
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


// Start
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateTime(); // Ensure global usage if needed

    // Event Listeners for Search Button/Enter handled in handleSearch area (preserved below)
    document.getElementById('search-btn').addEventListener('click', () => handleSearch('5y', '1mo'));
    document.getElementById('stock-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch('5y', '1mo');
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

