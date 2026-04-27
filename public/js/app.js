/**
 * KPI Dashboard — Main Application Controller
 */
const App = {
    currentSection: 'dashboard',
    currentPeriod: 'thisYear',
    cache: {},

    periods: [
        { key: 'today', label: 'Today' },
        { key: 'thisWeek', label: 'This Week' },
        { key: 'thisMonth', label: 'This Month' },
        { key: 'thisYear', label: 'This Year' },
        { key: 'ytd', label: 'YTD' },
        { key: 'thisQuarter', label: 'This Quarter' },
        { key: 'lastMonth', label: 'Last Month' },
        { key: 'lastYear', label: 'Last Year' },
        { key: 'lastYearQuarter', label: 'Last Year Qtr' },
        { key: 'lastYearYTD', label: 'Last Year YTD' },
    ],

    async init() {
        if (!localStorage.getItem('kpi_token')) {
            window.location.href = '/login.html';
            return;
        }
        
        this.initTheme();
        this.bindNav();
        this.bindPeriods();
        this.bindRefresh();
        this.bindMenuToggle();
        this.bindLogout();
        this.showSection('dashboard');
    },

    bindLogout() {
        const btn = document.getElementById('logoutBtn');
        if (btn) btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('kpi_token');
            localStorage.removeItem('kpi_user');
            window.location.href = '/login.html';
        });
    },

    initTheme() {
        const savedTheme = localStorage.getItem('kpi_theme') || 'dark';
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.getElementById('themeToggleBtn').textContent = '🌙';
            if (window.ChartManager) ChartManager.updateTheme(true);
        }

        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    toggleTheme() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const newTheme = isLight ? 'dark' : 'light';
        const btn = document.getElementById('themeToggleBtn');
        
        if (newTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            if (btn) btn.textContent = '🌙';
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (btn) btn.textContent = '☀️';
        }
        
        localStorage.setItem('kpi_theme', newTheme);
        if (window.ChartManager) ChartManager.updateTheme(newTheme === 'light');
    },

    bindNav() {
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                // Close mobile sidebar
                document.querySelector('.sidebar')?.classList.remove('open');
            });
        });
    },

    bindPeriods() {
        const customPicker = document.getElementById('customDatePicker');
        
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                
                if (period === 'custom') {
                    customPicker.style.display = 'flex';
                } else {
                    customPicker.style.display = 'none';
                    this.currentPeriod = period;
                    this.cache = {};
                    this.loadSectionData(this.currentSection);
                }
                
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        const applyBtn = document.getElementById('applyCustomDate');
        if (applyBtn) applyBtn.addEventListener('click', () => {
            const start = document.getElementById('customStartDate').value;
            const end = document.getElementById('customEndDate').value;
            if (!start || !end) return alert('Please select both start and end dates');
            
            this.currentPeriod = `custom&startDate=${start}&endDate=${end}`;
            this.cache = {};
            this.loadSectionData(this.currentSection);
        });
    },

    bindRefresh() {
        const btn = document.getElementById('refreshBtn');
        if (btn) btn.addEventListener('click', () => {
            this.cache = {};
            btn.classList.add('spinning');
            this.loadSectionData(this.currentSection).finally(() => {
                setTimeout(() => btn.classList.remove('spinning'), 500);
            });
        });
    },

    bindMenuToggle() {
        const btn = document.querySelector('.menu-toggle');
        if (btn) btn.addEventListener('click', () => {
            document.querySelector('.sidebar')?.classList.toggle('open');
        });
    },

    showSection(section) {
        this.currentSection = section;
        document.querySelectorAll('.kpi-section').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(`section-${section}`);
        if (el) el.classList.add('active');
        // Update topbar title
        const titles = { dashboard: 'Dashboard Overview', operations: 'Operations', sales: 'Sales & Revenue', financial: 'Financial Ratios', hr: 'Team / HR', compare: 'Service vs Parts Compare', branches: 'Branches Breakdown', accounts: 'Accounts & General Ledger' };
        const h2 = document.querySelector('.topbar-left h2');
        if (h2) h2.textContent = titles[section] || 'Dashboard';
        this.loadSectionData(section);
    },

    async fetchAPI(endpoint) {
        const url = `/api/kpi/${endpoint}?period=${this.currentPeriod}`;
        if (this.cache[url]) return this.cache[url];
        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('kpi_token')}` }
            });
            if (res.status === 401) {
                localStorage.removeItem('kpi_token');
                window.location.href = '/login.html';
                return null;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.cache[url] = data;
            this.setConnectionStatus(true);
            return data;
        } catch (err) {
            console.error(`API Error (${endpoint}):`, err);
            this.setConnectionStatus(false);
            return null;
        }
    },

    setConnectionStatus(ok) {
        const dot = document.querySelector('.status-dot');
        const txt = document.querySelector('.status-text');
        if (dot) dot.className = ok ? 'status-dot' : 'status-dot error';
        if (txt) txt.textContent = ok ? 'Connected' : 'Disconnected';
    },

    async loadSectionData(section) {
        switch (section) {
            case 'dashboard': await this.loadDashboard(); break;
            case 'operations': await this.loadOperations(); break;
            case 'sales': await this.loadSales(); break;
            case 'financial': await this.loadFinancial(); break;
            case 'hr': await this.loadHR(); break;
            case 'compare': await this.loadCompare(); break;
            case 'branches': await this.loadBranches(); break;
            case 'accounts': await this.loadAccounts(); break;
        }
    },

    // ========= FORMATTERS =========
    fmt(val, type = 'number') {
        if (val === null || val === undefined) return '—';
        if (type === 'currency') return '৳' + Number(val).toLocaleString('en-IN');
        if (type === 'percent') return Number(val).toFixed(1) + '%';
        if (type === 'ratio') return Number(val).toFixed(2);
        return Number(val).toLocaleString();
    },

    setCard(id, value, sub = '') {
        const card = document.getElementById(id);
        if (!card) return;
        card.classList.remove('loading');
        const valEl = card.querySelector('.card-value');
        const subEl = card.querySelector('.card-sub');
        if (valEl) { valEl.textContent = value; this.animateValue(valEl); }
        if (subEl && sub) subEl.textContent = sub;
    },

    setLoading(ids) {
        ids.forEach(id => {
            const card = document.getElementById(id);
            if (card) card.classList.add('loading');
        });
    },

    animateValue(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(8px)';
        requestAnimationFrame(() => {
            el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    },

    // ========= DASHBOARD =========
    async loadDashboard() {
        const [dash, trend, custType] = await Promise.all([
            this.fetchAPI('dashboard'),
            this.fetchAPI('revenue-trend'),
            this.fetchAPI('customer-type'),
        ]);

        if (dash && dash.summary) {
            const s = dash.summary;
            this.setCard('hero-revenue', this.fmt(s.totalRevenue, 'currency'), 'Total Revenue');
            this.setCard('hero-profit', this.fmt(s.grossProfit, 'currency'), `Margin: ${this.fmt(s.grossProfitMargin, 'percent')}`);
            this.setCard('hero-jobs', this.fmt(s.jobsCreated), `Completed: ${this.fmt(s.jobsCompleted)}`);
            this.setCard('hero-employees', this.fmt(s.totalEmployees), `Completion: ${this.fmt(s.jobCompletionRate, 'percent')}`);
            // Summary cards
            this.setCard('dash-open-jobs', this.fmt(s.jobsOpen));
            this.setCard('dash-appointments', this.fmt(s.appointmentRequests));
            this.setCard('dash-completion', this.fmt(s.jobCompletionRate, 'percent'));
            this.setCard('dash-cancellation', this.fmt(s.cancellationRate, 'percent'));
        }

        if (trend && trend.trend) {
            const labels = trend.trend.map(t => t.month);
            const data = trend.trend.map(t => t.total);
            ChartManager.createLineChart('revenueChart', labels, [{ label: 'Revenue', data }]);
        }

        if (custType && custType.data) {
            const labels = custType.data.slice(0, 7).map(d => d.type);
            const data = custType.data.slice(0, 7).map(d => d.total);
            ChartManager.createDoughnutChart('customerTypeChart', labels, data);
        }
    },

    // ========= OPERATIONS =========
    async loadOperations() {
        const data = await this.fetchAPI('operations');
        if (!data || !data.kpis) return;
        const k = data.kpis;
        this.setCard('op-appointments', this.fmt(k.appointmentRequests));
        this.setCard('op-proposals', this.fmt(k.proposalsCreated));
        this.setCard('op-proposals-out', this.fmt(k.proposalsOutstanding));
        this.setCard('op-jobs-created', this.fmt(k.jobsCreated));
        this.setCard('op-jobs-scheduled', this.fmt(k.jobsScheduled));
        this.setCard('op-jobs-completed', this.fmt(k.jobsCompleted));
        this.setCard('op-jobs-worked', this.fmt(k.jobsWorked));
        this.setCard('op-jobs-open', this.fmt(k.jobsOpen));
        this.setCard('op-completion-rate', this.fmt(k.jobCompletionRate, 'percent'));
        this.setCard('op-booking-time', k.bookingTimeCompletion ? this.fmt(k.bookingTimeCompletion.completionPercent, 'percent') : '—');
        this.setCard('op-jobs-per-tech', this.fmt(k.jobsPerTech, 'ratio'));
        this.setCard('op-cancellation', this.fmt(k.cancellationRate, 'percent'));
    },

    // ========= SALES =========
    async loadSales() {
        const [data, trend] = await Promise.all([
            this.fetchAPI('sales'),
            this.fetchAPI('revenue-trend'),
        ]);
        if (data && data.kpis) {
            const k = data.kpis;
            this.setCard('sales-total-rev', this.fmt(k.totalRevenue, 'currency'));
            this.setCard('sales-svc-rev', this.fmt(k.serviceRevenue, 'currency'));
            this.setCard('sales-parts-rev', this.fmt(k.partsRevenue, 'currency'));
            this.setCard('sales-mtd', this.fmt(k.monthToDateRevenue, 'currency'));
            this.setCard('sales-last-month', this.fmt(k.lastMonthRevenue, 'currency'));
            this.setCard('sales-expense', this.fmt(k.totalExpense, 'currency'));
            this.setCard('sales-cancel-rate', this.fmt(k.cancellationRate, 'percent'));
            this.setCard('sales-avg-quote', this.fmt(k.averageQuoteValue, 'currency'));
            this.setCard('sales-rev-per-tech', this.fmt(k.revenuePerTech, 'currency'));
            this.setCard('sales-yoy', this.fmt(k.revenueGrowthYoY, 'percent'));
        }
        if (trend && trend.trend) {
            ChartManager.createBarChart('salesTrendChart',
                trend.trend.map(t => t.month),
                [{ label: 'Monthly Revenue', data: trend.trend.map(t => t.total) }]
            );
        }
    },

    // ========= FINANCIAL =========
    async loadFinancial() {
        const data = await this.fetchAPI('financial');
        if (!data || !data.kpis) return;
        const k = data.kpis;
        this.setCard('fin-total-rev', this.fmt(k.totalRevenue, 'currency'));
        this.setCard('fin-mtd', this.fmt(k.monthToDateRevenue, 'currency'));
        this.setCard('fin-last-month', this.fmt(k.lastMonthRevenue, 'currency'));
        this.setCard('fin-cogs', this.fmt(k.costOfGoods, 'currency'));
        this.setCard('fin-gross-profit', this.fmt(k.grossProfit, 'currency'));
        this.setCard('fin-gross-margin', this.fmt(k.grossProfitMargin, 'percent'));
        this.setCard('fin-net-profit', this.fmt(k.netProfit, 'currency'));
        this.setCard('fin-net-margin', this.fmt(k.netProfitMargin, 'percent'));
        this.setCard('fin-profit-dollar', this.fmt(k.profitMarginDollar, 'currency'));
        this.setCard('fin-profit-pct', this.fmt(k.profitMarginPercent, 'percent'));
        this.setCard('fin-cash', this.fmt(k.cashBalance, 'currency'));
        this.setCard('fin-ar', this.fmt(k.accountsReceivable, 'currency'));
        this.setCard('fin-ap', this.fmt(k.accountsPayableOutstanding, 'currency'));
        this.setCard('fin-rev-emp', this.fmt(k.revenuePerEmployee, 'currency'));
        this.setCard('fin-quick-ratio', typeof k.quickRatio === 'number' ? this.fmt(k.quickRatio, 'ratio') : k.quickRatio);
        this.setCard('fin-labor-pct', this.fmt(k.laborCostPercentage, 'percent'));
        this.setCard('fin-avg-job', this.fmt(k.averageJobValue, 'currency'));
        this.setCard('fin-yoy', this.fmt(k.revenueGrowthYoY, 'percent'));
    },

    // ========= HR =========
    async loadHR() {
        const data = await this.fetchAPI('hr');
        if (!data || !data.kpis) return;
        const k = data.kpis;
        this.setCard('hr-total', this.fmt(k.totalEmployees));
        this.setCard('hr-service', this.fmt(k.serviceEmployees));
        this.setCard('hr-parts', this.fmt(k.partsEmployees));

        if (k.byRole && k.byRole.length > 0) {
            const top = k.byRole.slice(0, 10);
            ChartManager.createHorizontalBarChart('roleChart', top.map(r => r.role), top.map(r => r.count));
        }

        // Branch table
        const tbody = document.getElementById('branchTableBody');
        if (tbody && k.byBranch) {
            tbody.innerHTML = '';
            for (const [branch, roles] of Object.entries(k.byBranch)) {
                const total = roles.reduce((a, r) => a + r.count, 0);
                tbody.innerHTML += `<tr><td style="font-weight:600">${branch}</td><td>${total}</td><td>${roles.map(r => `${r.role} (${r.count})`).slice(0,3).join(', ')}</td></tr>`;
            }
        }
    },

    // ========= COMPARE =========
    async loadCompare() {
        const data = await this.fetchAPI('compare');
        if (!data || !data.comparison) return;
        
        const cmp = data.comparison;
        
        this.setCard('cmp-service-rev', this.fmt(cmp.revenue.service, 'currency'), `${cmp.percentages.serviceRevPct}% of total`);
        this.setCard('cmp-parts-rev', this.fmt(cmp.revenue.parts, 'currency'), `${cmp.percentages.partsRevPct}% of total`);
        
        this.setCard('cmp-service-profit', this.fmt(cmp.grossProfit.service, 'currency'));
        this.setCard('cmp-parts-profit', this.fmt(cmp.grossProfit.parts, 'currency'));
        
        this.setCard('cmp-service-emp', this.fmt(cmp.employees.service));
        this.setCard('cmp-parts-emp', this.fmt(cmp.employees.parts));

        ChartManager.createBarChart('compareRevenueChart', ['Service', 'Parts'], [
            { label: 'Revenue', data: [cmp.revenue.service, cmp.revenue.parts], colors: [ChartManager.colors.blue, ChartManager.colors.purple] },
            { label: 'COGS', data: [cmp.cogs.service, cmp.cogs.parts], colors: [ChartManager.colors.red, ChartManager.colors.red] }
        ]);

        ChartManager.createDoughnutChart('compareProfitChart', ['Service Profit', 'Parts Profit'], [cmp.grossProfit.service, cmp.grossProfit.parts], [ChartManager.colors.blue, ChartManager.colors.purple]);
    },

    // ========= BRANCHES =========
    async loadBranches() {
        const data = await this.fetchAPI('branches');
        if (!data || !data.branches) return;
        
        const bSvc = data.branches.service;
        const bParts = data.branches.parts;
        
        // Populate Service Table
        const svcTb = document.getElementById('svcBranchesTable').querySelector('tbody');
        svcTb.innerHTML = '';
        const svcLabels = []; const svcData = [];
        for (const [key, d] of Object.entries(bSvc)) {
            svcTb.innerHTML += `<tr><td>${key}</td><td>${this.fmt(d.revenue, 'currency')}</td><td>${this.fmt(d.jobsCompleted)}</td></tr>`;
            svcLabels.push(key);
            svcData.push(d.revenue);
        }

        // Populate Parts Table
        const partsTb = document.getElementById('partsBranchesTable').querySelector('tbody');
        partsTb.innerHTML = '';
        const partsLabels = []; const partsData = [];
        for (const [key, d] of Object.entries(bParts)) {
            partsTb.innerHTML += `<tr><td>${key}</td><td>${this.fmt(d.revenue, 'currency')}</td></tr>`;
            partsLabels.push(key);
            partsData.push(d.revenue);
        }

        // Charts
        ChartManager.createBarChart('branchSvcChart', svcLabels, [
            { label: 'Revenue', data: svcData, colors: Array(svcLabels.length).fill(ChartManager.colors.blue) }
        ]);

        ChartManager.createBarChart('branchPartsChart', partsLabels, [
            { label: 'Revenue', data: partsData, colors: Array(partsLabels.length).fill(ChartManager.colors.purple) }
        ]);
    },

    // ========= ACCOUNTS =========
    async loadAccounts() {
        const data = await this.fetchAPI('accounts');
        if (!data || !data.accounts) return;
        
        const acc = data.accounts;
        
        this.setCard('acc-bank-total', this.fmt(acc.totalBankTransactionsAmount, 'currency'));
        this.setCard('acc-bank-count', this.fmt(acc.bankTransactionCount));
        this.setCard('acc-journal-count', this.fmt(acc.totalJournalEntries));
        this.setCard('acc-accounts-count', this.fmt(acc.activeAccountsCount));

        // Populate Latest Journals Table
        const tb = document.getElementById('accJournalsTable').querySelector('tbody');
        tb.innerHTML = '';
        if (acc.latestJournals && acc.latestJournals.length > 0) {
            for (const j of acc.latestJournals) {
                const date = new Date(j.TransactionDate).toLocaleDateString();
                tb.innerHTML += `<tr><td>${j.VoucherNo}</td><td>${date}</td><td>${j.UserName}</td><td>${j.CostCentreId}</td></tr>`;
            }
        } else {
            tb.innerHTML = `<tr><td colspan="4">No recent journal entries found.</td></tr>`;
        }
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
