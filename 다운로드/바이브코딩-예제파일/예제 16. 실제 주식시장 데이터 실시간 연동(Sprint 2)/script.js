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
                display: false, // Hide X axis labels for cleaner look
                grid: {
                    display: false
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
                radius: 0, // Hide points by default
                hoverRadius: 6
            },
            line: {
                tension: 0.4, // Smooth curves
                borderWidth: 2
            }
        },
        animation: {
            duration: 0 // Disable general animation for performance on updates
        }
    }
};

// Indices Configuration with Real Symbols
const indices = [
    { id: 'kospi', name: '코스피', symbol: '^KS11' },
    { id: 'kosdaq', name: '코스닥', symbol: '^KQ11' },
    { id: 'nasdaq', name: '나스닥', symbol: '^IXIC' },
    { id: 'sp500', name: 'S&P 500', symbol: '^GSPC' }
];

// Chart Instances
const charts = {};

// Fetch Stock Data
async function fetchStockData(symbol) {
    try {
        const encodedUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`);
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodedUrl}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const result = data.chart.result[0];
        
        const timestamps = result.timestamp || [];
        const quotes = result.indicators.quote[0];
        const closes = quotes.close || [];
        
        // Filter out null values (market closed/breaks)
        const validData = timestamps.map((t, i) => ({
            time: t,
            price: closes[i]
        })).filter(item => item.price !== null);

        const regularMarketPrice = result.meta.regularMarketPrice;
        const chartPreviousClose = result.meta.chartPreviousClose;

        return {
            prices: validData.map(item => item.price),
            currentPrice: regularMarketPrice,
            prevClose: chartPreviousClose,
            lastUpdated: validData.length > 0 ? validData[validData.length - 1].time : null
        };
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
    }
}

// Initialize Charts
async function initCharts() {
    for (const index of indices) {
        const ctx = document.getElementById(`${index.id}Chart`).getContext('2d');
        
        // Initial empty chart
        const config = JSON.parse(JSON.stringify(chartConfig));
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
    const data = await fetchStockData(index.symbol);
    if (!data) return;

    const chart = charts[index.id];
    const prices = data.prices;
    const currentPrice = data.currentPrice;
    const prevClose = data.prevClose;

    // Determine color based on change from previous close
    const isPositive = currentPrice >= prevClose;
    const color = isPositive ? '#2ebd85' : '#f6465d';
    
    // Update Chart
    chart.data.labels = Array(prices.length).fill('');
    chart.data.datasets[0].data = prices;
    chart.data.datasets[0].borderColor = color;
    
    // Update Gradient
    const ctx = chart.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, isPositive ? 'rgba(46, 189, 133, 0.2)' : 'rgba(246, 70, 93, 0.2)');
    gradient.addColorStop(1, isPositive ? 'rgba(46, 189, 133, 0)' : 'rgba(246, 70, 93, 0)');
    chart.data.datasets[0].backgroundColor = gradient;
    
    chart.update('none');

    // Update Text Display
    updatePriceDisplay(index.id, currentPrice, prevClose);
}

// Update All
async function updateDashboard() {
    for (const index of indices) {
        await updateIndexData(index);
    }
}

function updatePriceDisplay(id, current,  prevClose) {
    const elPrice = document.querySelector(`#${id}-price .current-price`);
    const elChange = document.querySelector(`#${id}-price .change-percent`);

    if (!elPrice || !elChange) return;

    const diff = current - prevClose;
    const percent = (diff / prevClose) * 100;
    const isPositive = diff >= 0;

    elPrice.textContent = current.toFixed(2);
    // Add comma for thousands
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

// Start
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateTime();

    // Updates
    setInterval(updateDashboard, 60000); // Update prices every 60s to respect API limits
    setInterval(updateTime, 1000); // Update clock every 1s
});
