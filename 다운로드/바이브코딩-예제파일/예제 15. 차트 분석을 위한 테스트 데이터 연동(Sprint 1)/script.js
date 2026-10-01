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

// Mock Data Generators
function generateIntradayData(basePrice, points = 100) {
    let data = [];
    let currentPrice = basePrice;

    for (let i = 0; i < points; i++) {
        let change = (Math.random() - 0.5) * (basePrice * 0.005);
        currentPrice += change;
        data.push(currentPrice);
    }
    return data;
}

// Chart Instances
const charts = {};

// Indices Configuration
const indices = [
    { id: 'kospi', name: '코스피', base: 2650.00 },
    { id: 'kosdaq', name: '코스닥', base: 870.00 },
    { id: 'nasdaq', name: '나스닥', base: 16200.00 },
    { id: 'sp500', name: 'S&P 500', base: 5100.00 }
];

// Initialize Charts
function initCharts() {
    indices.forEach(index => {
        const ctx = document.getElementById(`${index.id}Chart`).getContext('2d');
        const initialData = generateIntradayData(index.base);

        // Create Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(46, 189, 133, 0.2)'); // Default Green
        gradient.addColorStop(1, 'rgba(46, 189, 133, 0)');

        const config = JSON.parse(JSON.stringify(chartConfig)); // Deep copy config

        config.data = {
            labels: Array(initialData.length).fill(''),
            datasets: [{
                label: index.name,
                data: initialData,
                borderColor: '#2ebd85', // Default Green
                backgroundColor: gradient,
                fill: true
            }]
        };

        charts[index.id] = new Chart(ctx, config);

        // Initial Price Display
        updatePriceDisplay(index.id, initialData[initialData.length - 1], index.base);
    });
}

// Update Logic
function updateDashboard() {
    indices.forEach(index => {
        const chart = charts[index.id];
        const currentData = chart.data.datasets[0].data;
        const lastPrice = currentData[currentData.length - 1];

        // Simulate new price tick
        const volatility = index.base * 0.0005; // 0.05% volatility
        const change = (Math.random() - 0.5) * volatility * 2;
        const newPrice = lastPrice + change;

        // Update Chart Data (Shift)
        currentData.push(newPrice);
        currentData.shift();

        // Update Colors based on daily change (vs Base)
        const isPositive = newPrice >= index.base;
        const color = isPositive ? '#2ebd85' : '#f6465d';
        const ctx = chart.ctx;

        // Update Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, isPositive ? 'rgba(46, 189, 133, 0.2)' : 'rgba(246, 70, 93, 0.2)');
        gradient.addColorStop(1, isPositive ? 'rgba(46, 189, 133, 0)' : 'rgba(246, 70, 93, 0)');

        chart.data.datasets[0].borderColor = color;
        chart.data.datasets[0].backgroundColor = gradient;

        chart.update('none'); // Update without animation for smooth flow

        // Update Text Display
        updatePriceDisplay(index.id, newPrice, index.base);
    });
}

function updatePriceDisplay(id, current, base) {
    const elPrice = document.querySelector(`#${id}-price .current-price`);
    const elChange = document.querySelector(`#${id}-price .change-percent`);

    if (!elPrice || !elChange) return;

    const diff = current - base;
    const percent = (diff / base) * 100;
    const isPositive = diff >= 0;

    elPrice.textContent = current.toFixed(2);
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
    setInterval(updateDashboard, 2000); // Update prices every 2s
    setInterval(updateTime, 1000); // Update clock every 1s
});
