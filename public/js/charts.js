/**
 * Chart.js configuration and rendering for KPI Dashboard
 */

const ChartManager = {
    charts: {},
    colors: {
        blue: '#3b82f6', purple: '#8b5cf6', teal: '#14b8a6',
        pink: '#ec4899', amber: '#f59e0b', green: '#22c55e', red: '#ef4444',
        blueFade: 'rgba(59,130,246,0.1)', purpleFade: 'rgba(139,92,246,0.1)',
        tealFade: 'rgba(20,184,166,0.1)',
    },

    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17,24,39,0.95)',
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                titleFont: { family: 'Inter', weight: '600' },
                bodyFont: { family: 'Inter' },
                callbacks: {
                    label: ctx => {
                        let v = ctx.parsed.y ?? ctx.parsed;
                        if (typeof v === 'number' && v >= 1000) v = '৳' + v.toLocaleString();
                        return ` ${ctx.dataset.label || ''}: ${v}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                ticks: {
                    color: '#64748b', font: { family: 'Inter', size: 11 },
                    callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v
                }
            }
        }
    },

    destroy(id) {
        if (this.charts[id]) { this.charts[id].destroy(); delete this.charts[id]; }
    },

    createLineChart(canvasId, labels, datasets) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const ds = datasets.map((d, i) => ({
            label: d.label,
            data: d.data,
            borderColor: d.color || [this.colors.blue, this.colors.purple, this.colors.teal][i % 3],
            backgroundColor: d.bg || [this.colors.blueFade, this.colors.purpleFade, this.colors.tealFade][i % 3],
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: d.color || this.colors.blue,
        }));
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: ds },
            options: { ...this.defaultOptions, plugins: { ...this.defaultOptions.plugins, legend: { display: datasets.length > 1, labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, usePointStyle: true, pointStyle: 'circle' } } } }
        });
    },

    createBarChart(canvasId, labels, datasets) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const palette = [this.colors.blue, this.colors.purple, this.colors.teal, this.colors.pink, this.colors.amber, this.colors.green];
        const ds = datasets.map((d, i) => ({
            label: d.label,
            data: d.data,
            backgroundColor: d.colors || palette[i % palette.length],
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 40,
        }));
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: ds },
            options: { ...this.defaultOptions, plugins: { ...this.defaultOptions.plugins, legend: { display: datasets.length > 1, labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, usePointStyle: true, pointStyle: 'rect' } } } }
        });
    },

    createDoughnutChart(canvasId, labels, data, colors) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const palette = colors || [this.colors.blue, this.colors.purple, this.colors.teal, this.colors.pink, this.colors.amber, this.colors.green, this.colors.red];
        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: palette.slice(0, data.length), borderColor: 'transparent', borderWidth: 2, hoverOffset: 8 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: this.defaultOptions.plugins.tooltip
                }
            }
        });
    },

    createHorizontalBarChart(canvasId, labels, data, colors) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const palette = colors || [this.colors.blue, this.colors.purple, this.colors.teal, this.colors.pink, this.colors.amber, this.colors.green];
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ data, backgroundColor: palette.slice(0, data.length).map(c => c + '99'), borderColor: palette.slice(0, data.length), borderWidth: 1, borderRadius: 6, borderSkipped: false }] },
            options: {
                ...this.defaultOptions, indexAxis: 'y',
                scales: {
                    x: { ...this.defaultOptions.scales.x, beginAtZero: true },
                    y: { ...this.defaultOptions.scales.y, ticks: { ...this.defaultOptions.scales.y.ticks, callback: v => v } }
                }
            }
        });
    }
};

window.ChartManager = ChartManager;
