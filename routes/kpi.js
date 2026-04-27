const express = require('express');
const router = express.Router();
const db = require('../db');
const svcQ = require('../queries/serviceQueries');
const partsQ = require('../queries/partsQueries');

// ============================================================
// HELPER: aggregate a single-value query across service DBs
// ============================================================
async function sumServiceQuery(queryFn, period) {
    const results = await db.queryAllServiceDBs(queryFn(period));
    return db.sumField(results, 'total');
}

async function sumPartsQuery(queryFn, period) {
    const results = await db.queryAllPartsDBs(queryFn(period));
    return db.sumField(results, 'total');
}

function getPeriodObj(req) {
    const period = req.query.period || 'thisYear';
    if (period === 'custom') {
        return {
            period: 'custom',
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
    }
    return period;
}

// ============================================================
// GET /api/kpi/operations
// ============================================================
router.get('/operations', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [
            appointments, proposals, proposalsOut,
            created, completed, worked, open, cancelled, totalInc,
            working, notWorking,
            jptResults, btcResults, bayIncomeResults
        ] = await Promise.all([
            sumServiceQuery(svcQ.appointmentRequests, period),
            sumServiceQuery(svcQ.proposalsCreated, period),
            sumServiceQuery(svcQ.proposalsOutstanding, period),
            sumServiceQuery(svcQ.jobsCreated, period),
            sumServiceQuery(svcQ.jobsCompleted, period),
            sumServiceQuery(svcQ.jobsWorked, period),
            sumServiceQuery(svcQ.jobsOpen, period),
            sumServiceQuery(svcQ.jobsCancelled, period),
            sumServiceQuery(svcQ.totalJobsIncCancelled, period),
            sumServiceQuery(svcQ.workingJobs, period),
            sumServiceQuery(svcQ.notWorkingJobs, period),
            db.queryAllServiceDBs(svcQ.jobsPerTech(period)),
            db.queryAllServiceDBs(svcQ.bookingTimeCompletion(period)),
            db.queryAllServiceDBs(svcQ.bayWiseIncome(period)),
        ]);

        // Aggregate jobs per tech
        let totalJobs = 0, totalTechs = 0;
        for (const r of Object.values(jptResults)) {
            if (r.recordset && r.recordset[0]) {
                totalJobs += r.recordset[0].totalJobs || 0;
                totalTechs += r.recordset[0].totalTechs || 0;
            }
        }

        // Aggregate booking time
        let sumPromised = 0, sumActual = 0, btcCount = 0;
        for (const r of Object.values(btcResults)) {
            if (r.recordset && r.recordset[0] && r.recordset[0].total > 0) {
                sumPromised += (r.recordset[0].avgPromisedMinutes || 0) * r.recordset[0].total;
                sumActual += (r.recordset[0].avgActualMinutes || 0) * r.recordset[0].total;
                btcCount += r.recordset[0].total;
            }
        }

        // Aggregate bay income
        const bayIncomeMap = {};
        for (const [dbName, result] of Object.entries(bayIncomeResults)) {
            if (result.recordset) {
                for (const row of result.recordset) {
                    const bay = row.bay || 'Unassigned';
                    bayIncomeMap[bay] = (bayIncomeMap[bay] || 0) + (row.total || 0);
                }
            }
        }
        
        const bayWiseIncome = Object.entries(bayIncomeMap)
            .map(([bay, income]) => ({ bay, income }))
            .sort((a, b) => b.income - a.income);

        const completionRate = created > 0 ? ((completed / created) * 100).toFixed(1) : 0;
        const cancellationRate = totalInc > 0 ? ((cancelled / totalInc) * 100).toFixed(1) : 0;
        const jobsPerTechRatio = totalTechs > 0 ? (totalJobs / totalTechs).toFixed(1) : 0;
        const scheduled = worked; // approximation: worked ≈ scheduled

        res.json({
            period,
            kpis: {
                appointmentRequests: appointments,
                proposalsCreated: proposals,
                proposalsOutstanding: proposalsOut,
                jobsCreated: created,
                jobsScheduled: scheduled,
                jobsCompleted: completed,
                jobsWorked: worked,
                jobsOpen: open,
                workingJobs: working,
                notWorkingJobs: notWorking,
                jobCompletionRate: parseFloat(completionRate),
                cancellationRate: parseFloat(cancellationRate),
                bookingTimeCompletion: btcCount > 0 ? {
                    avgPromisedMinutes: Math.round(sumPromised / btcCount),
                    avgActualMinutes: Math.round(sumActual / btcCount),
                    completionPercent: sumPromised > 0 ? ((sumActual / sumPromised) * 100).toFixed(1) : 0
                } : { avgPromisedMinutes: 0, avgActualMinutes: 0, completionPercent: 0 },
                jobsPerTech: parseFloat(jobsPerTechRatio),
                bayWiseIncome
            }
        });
    } catch (err) {
        console.error('Operations KPI error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/kpi/sales
// ============================================================
router.get('/sales', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [
            svcRev, partsRev,
            svcExp, partsExp,
            avgQuote,
            rptResults, rptPartsResults,
            cancelled, totalInc,
        ] = await Promise.all([
            sumServiceQuery(svcQ.serviceRevenue, period),
            sumPartsQuery(partsQ.partsRevenue, period),
            sumServiceQuery(svcQ.serviceExpense, period),
            sumPartsQuery(partsQ.partsExpense, period),
            sumServiceQuery(svcQ.averageQuoteValue, period),
            db.queryAllServiceDBs(svcQ.revenuePerTech(period)),
            db.queryAllPartsDBs(partsQ.partsRevenueByMonth(period)),
            sumServiceQuery(svcQ.jobsCancelled, period),
            sumServiceQuery(svcQ.totalJobsIncCancelled, period),
        ]);

        const totalRevenue = svcRev + partsRev;
        const totalExpense = svcExp + partsExp;
        const cancellationRate = totalInc > 0 ? ((cancelled / totalInc) * 100).toFixed(1) : 0;

        // Revenue per tech aggregation
        let totalTechRev = 0, totalTechCount = 0;
        for (const r of Object.values(rptResults)) {
            if (r.recordset && r.recordset[0]) {
                totalTechRev += r.recordset[0].totalRevenue || 0;
                totalTechCount += r.recordset[0].totalTechs || 0;
            }
        }

        // MTD & Last Month
        const [mtdSvc, mtdParts, lmSvc, lmParts] = await Promise.all([
            sumServiceQuery(svcQ.serviceRevenue, 'thisMonth'),
            sumPartsQuery(partsQ.partsRevenue, 'thisMonth'),
            sumServiceQuery(svcQ.serviceRevenue, 'lastMonth'),
            sumPartsQuery(partsQ.partsRevenue, 'lastMonth'),
        ]);

        // YoY
        const [lySvc, lyParts] = await Promise.all([
            sumServiceQuery(svcQ.serviceRevenue, 'lastYear'),
            sumPartsQuery(partsQ.partsRevenue, 'lastYear'),
        ]);
        const lastYearRev = lySvc + lyParts;
        const yoyGrowth = lastYearRev > 0 ? (((totalRevenue - lastYearRev) / lastYearRev) * 100).toFixed(1) : 0;

        res.json({
            period,
            kpis: {
                totalRevenue,
                serviceRevenue: svcRev,
                partsRevenue: partsRev,
                monthToDateRevenue: mtdSvc + mtdParts,
                lastMonthRevenue: lmSvc + lmParts,
                totalExpense: totalExpense,
                cancellationRate: parseFloat(cancellationRate),
                averageQuoteValue: avgQuote,
                revenuePerTech: totalTechCount > 0 ? Math.round(totalTechRev / totalTechCount) : 0,
                revenueGrowthYoY: parseFloat(yoyGrowth),
            }
        });
    } catch (err) {
        console.error('Sales KPI error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/kpi/financial
// ============================================================
router.get('/financial', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [
            svcRev, partsRev,
            svcCOGS, partsCOGS_val,
            svcExp, partsExp,
            cashBal,
            svcAR, partsAR,
            partsAP,
            laborRev,
            avgJobResults,
            empCountSvc, empCountParts,
            custTypeResults, custTypePartsResults,
        ] = await Promise.all([
            sumServiceQuery(svcQ.serviceRevenue, period),
            sumPartsQuery(partsQ.partsRevenue, period),
            sumServiceQuery(svcQ.serviceCOGS, period),
            sumPartsQuery(partsQ.partsCOGS, period),
            sumServiceQuery(svcQ.serviceExpense, period),
            sumPartsQuery(partsQ.partsExpense, period),
            sumServiceQuery(svcQ.cashBalance, period),
            sumServiceQuery(() => svcQ.accountsReceivable(), period),
            sumPartsQuery(() => partsQ.partsAccountsReceivable(), period),
            sumPartsQuery(() => partsQ.partsAccountsPayable(), period),
            sumServiceQuery(svcQ.laborRevenue, period),
            db.queryAllServiceDBs(svcQ.averageJobValue(period)),
            sumServiceQuery(svcQ.activeEmployeeCount, period),
            sumPartsQuery(() => partsQ.partsEmployeeCount(), period),
        ]);

        const totalRevenue = svcRev + partsRev;
        const totalCOGS = svcCOGS + partsCOGS_val;
        const totalExpense = svcExp + partsExp;
        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = totalRevenue - totalCOGS - totalExpense;
        const totalAR = svcAR + partsAR;
        const totalAP = Math.abs(partsAP);
        const totalEmp = empCountSvc + empCountParts;

        // Average job value
        let totalJobRev = 0, totalJobCount = 0;
        for (const r of Object.values(avgJobResults)) {
            if (r.recordset && r.recordset[0]) {
                totalJobRev += r.recordset[0].totalRev || 0;
                totalJobCount += r.recordset[0].totalJobs || 0;
            }
        }

        // MTD, Last Month
        const [mtdSvc, mtdParts, lmSvc, lmParts] = await Promise.all([
            sumServiceQuery(svcQ.serviceRevenue, 'thisMonth'),
            sumPartsQuery(partsQ.partsRevenue, 'thisMonth'),
            sumServiceQuery(svcQ.serviceRevenue, 'lastMonth'),
            sumPartsQuery(partsQ.partsRevenue, 'lastMonth'),
        ]);

        // YoY
        const [lySvc, lyParts] = await Promise.all([
            sumServiceQuery(svcQ.serviceRevenue, 'lastYear'),
            sumPartsQuery(partsQ.partsRevenue, 'lastYear'),
        ]);
        const lastYearRev = lySvc + lyParts;

        const quickRatio = totalAP > 0 ? ((cashBal + totalAR) / totalAP).toFixed(2) : 'N/A';

        res.json({
            period,
            kpis: {
                totalRevenue,
                monthToDateRevenue: mtdSvc + mtdParts,
                lastMonthRevenue: lmSvc + lmParts,
                costOfGoods: totalCOGS,
                grossProfit,
                grossProfitMargin: totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0,
                netProfit,
                netProfitMargin: totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0,
                profitMarginDollar: grossProfit,
                profitMarginPercent: totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0,
                cashBalance: cashBal,
                accountsReceivable: totalAR,
                accountsPayableOutstanding: totalAP,
                revenuePerEmployee: totalEmp > 0 ? Math.round(totalRevenue / totalEmp) : 0,
                quickRatio: quickRatio === 'N/A' ? quickRatio : parseFloat(quickRatio),
                laborCostPercentage: totalRevenue > 0 ? parseFloat(((laborRev / totalRevenue) * 100).toFixed(1)) : 0,
                averageJobValue: totalJobCount > 0 ? Math.round(totalJobRev / totalJobCount) : 0,
                revenueGrowthYoY: lastYearRev > 0 ? parseFloat((((totalRevenue - lastYearRev) / lastYearRev) * 100).toFixed(1)) : 0,
                profit: grossProfit,
            }
        });
    } catch (err) {
        console.error('Financial KPI error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/kpi/hr
// ============================================================
router.get('/hr', async (req, res) => {
    try {
        const results = await db.queryAllServiceDBs(svcQ.employeeCountByRole());
        
        // Merge roles across branches
        const roleMap = {};
        const branchDetails = {};
        
        for (const [branch, result] of Object.entries(results)) {
            branchDetails[branch] = [];
            if (result.recordset) {
                for (const row of result.recordset) {
                    const role = row.role || 'Unknown';
                    roleMap[role] = (roleMap[role] || 0) + (row.total || 0);
                    branchDetails[branch].push({ role, count: row.total });
                }
            }
        }

        // Parts employee counts
        const partsResults = await db.queryAllPartsDBs(partsQ.partsEmployeeCount());
        let partsEmpTotal = 0;
        for (const r of Object.values(partsResults)) {
            if (r.recordset && r.recordset[0]) {
                partsEmpTotal += r.recordset[0].total || 0;
            }
        }

        const totalEmployees = Object.values(roleMap).reduce((a, b) => a + b, 0) + partsEmpTotal;

        res.json({
            kpis: {
                totalEmployees,
                serviceEmployees: Object.values(roleMap).reduce((a, b) => a + b, 0),
                partsEmployees: partsEmpTotal,
                byRole: Object.entries(roleMap)
                    .map(([role, count]) => ({ role, count }))
                    .sort((a, b) => b.count - a.count),
                byBranch: branchDetails,
            }
        });
    } catch (err) {
        console.error('HR KPI error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/kpi/dashboard — Combined overview
// ============================================================
router.get('/dashboard', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [
            svcRev, partsRev,
            created, completed, open,
            appointments,
            svcCOGS, partsCOGS_val,
            empSvc, empParts,
            cancelled, totalInc,
        ] = await Promise.all([
            sumServiceQuery(svcQ.serviceRevenue, period),
            sumPartsQuery(partsQ.partsRevenue, period),
            sumServiceQuery(svcQ.jobsCreated, period),
            sumServiceQuery(svcQ.jobsCompleted, period),
            sumServiceQuery(svcQ.jobsOpen, period),
            sumServiceQuery(svcQ.appointmentRequests, period),
            sumServiceQuery(svcQ.serviceCOGS, period),
            sumPartsQuery(partsQ.partsCOGS, period),
            sumServiceQuery(svcQ.activeEmployeeCount, period),
            sumPartsQuery(() => partsQ.partsEmployeeCount(), period),
        ]);

        const totalRevenue = svcRev + partsRev;
        const totalCOGS = svcCOGS + partsCOGS_val;
        const grossProfit = totalRevenue - totalCOGS;
        const completionRate = created > 0 ? ((completed / created) * 100).toFixed(1) : 0;
        const totalEmp = empSvc + empParts;

        res.json({
            period,
            summary: {
                totalRevenue,
                grossProfit,
                grossProfitMargin: totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0,
                jobsCreated: created,
                jobsCompleted: completed,
                jobsOpen: open,
                jobCompletionRate: parseFloat(completionRate),
                appointmentRequests: appointments,
                totalEmployees: totalEmp,
                cancellationRate: totalInc > 0 ? parseFloat(((cancelled / totalInc) * 100).toFixed(1)) : 0,
            }
        });
    } catch (err) {
        console.error('Dashboard KPI error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/kpi/revenue-trend — Monthly revenue trend
// ============================================================
router.get('/revenue-trend', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [svcResults, partsResults] = await Promise.all([
            db.queryAllServiceDBs(svcQ.serviceRevenueByMonth(period)),
            db.queryAllPartsDBs(partsQ.partsRevenueByMonth(period)),
        ]);

        // Merge by month
        const monthMap = {};
        for (const results of [svcResults, partsResults]) {
            for (const r of Object.values(results)) {
                if (r.recordset) {
                    for (const row of r.recordset) {
                        const key = `${row.yr}-${String(row.mo).padStart(2, '0')}`;
                        monthMap[key] = (monthMap[key] || 0) + (row.total || 0);
                    }
                }
            }
        }

        const trend = Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, total]) => ({ month, total }));

        res.json({ period, trend });
    } catch (err) {
        console.error('Revenue trend error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/kpi/customer-type — Revenue by customer type
// ============================================================
router.get('/customer-type', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [svcResults, partsResults] = await Promise.all([
            db.queryAllServiceDBs(svcQ.revenueByCustomerType(period)),
            db.queryAllPartsDBs(partsQ.partsRevenueByCustomerType(period)),
        ]);

        const typeMap = {};
        for (const results of [svcResults, partsResults]) {
            for (const r of Object.values(results)) {
                if (r.recordset) {
                    for (const row of r.recordset) {
                        const t = row.customerType || 'Unknown';
                        typeMap[t] = (typeMap[t] || 0) + (row.total || 0);
                    }
                }
            }
        }

        const data = Object.entries(typeMap)
            .map(([type, total]) => ({ type, total }))
            .sort((a, b) => b.total - a.total);

        res.json({ period, data });
    } catch (err) {
        console.error('Customer type error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/kpi/compare — Service vs Parts Comparison
// ============================================================
router.get('/compare', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [
            svcRev, partsRev,
            svcExp, partsExp,
            svcCOGS, partsCOGS_val,
            empSvc, empParts,
        ] = await Promise.all([
            sumServiceQuery(svcQ.serviceRevenue, period),
            sumPartsQuery(partsQ.partsRevenue, period),
            sumServiceQuery(svcQ.serviceExpense, period),
            sumPartsQuery(partsQ.partsExpense, period),
            sumServiceQuery(svcQ.serviceCOGS, period),
            sumPartsQuery(partsQ.partsCOGS, period),
            sumServiceQuery(svcQ.activeEmployeeCount, period),
            sumPartsQuery(() => partsQ.partsEmployeeCount(), period),
        ]);

        const svcProfit = svcRev - svcCOGS;
        const partsProfit = partsRev - partsCOGS_val;
        const totalRev = svcRev + partsRev;

        res.json({
            period,
            comparison: {
                revenue: { service: svcRev, parts: partsRev },
                expense: { service: svcExp, parts: partsExp },
                cogs: { service: svcCOGS, parts: partsCOGS_val },
                grossProfit: { service: svcProfit, parts: partsProfit },
                employees: { service: empSvc, parts: empParts },
                percentages: {
                    serviceRevPct: totalRev > 0 ? ((svcRev / totalRev) * 100).toFixed(1) : 0,
                    partsRevPct: totalRev > 0 ? ((partsRev / totalRev) * 100).toFixed(1) : 0,
                }
            }
        });
    } catch (err) {
        console.error('Compare KPI error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// GET /api/kpi/branches — Individual DB Breakdown
// ============================================================
router.get('/branches', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [
            svcRevRaw, svcJobsRaw,
            partsRevRaw
        ] = await Promise.all([
            db.queryAllServiceDBs(svcQ.serviceRevenue(period)),
            db.queryAllServiceDBs(svcQ.jobsCompleted(period)),
            db.queryAllPartsDBs(partsQ.partsRevenue(period))
        ]);

        const serviceBranches = {};
        for (const [key, result] of Object.entries(svcRevRaw)) {
            serviceBranches[key] = { revenue: 0, jobsCompleted: 0 };
            if (result.recordset && result.recordset[0]) {
                serviceBranches[key].revenue = result.recordset[0].total || 0;
            }
        }
        for (const [key, result] of Object.entries(svcJobsRaw)) {
            if (result.recordset && result.recordset[0] && serviceBranches[key]) {
                serviceBranches[key].jobsCompleted = result.recordset[0].total || 0;
            }
        }

        const partsBranches = {};
        for (const [key, result] of Object.entries(partsRevRaw)) {
            partsBranches[key] = { revenue: 0 };
            if (result.recordset && result.recordset[0]) {
                partsBranches[key].revenue = result.recordset[0].total || 0;
            }
        }

        res.json({
            period,
            branches: {
                service: serviceBranches,
                parts: partsBranches
            }
        });
    } catch (err) {
        console.error('Branches KPI error:', err);
        res.status(500).json({ error: err.message });
    }
});

const accQ = require('../queries/accountQueries');

// ============================================================
// GET /api/kpi/accounts — General Ledger & Bank
// ============================================================
router.get('/accounts', async (req, res) => {
    const period = getPeriodObj(req);
    try {
        const [
            bankTotalRes, bankCountRes,
            journalRes,
            accountsRes, latestJournalsRes
        ] = await Promise.all([
            db.queryAccountsDB(accQ.totalBankTransactions(period)),
            db.queryAccountsDB(accQ.bankTransactionCount(period)),
            db.queryAccountsDB(accQ.totalJournalEntries(period)),
            db.queryAccountsDB(accQ.activeAccountsCount()),
            db.queryAccountsDB(accQ.latestJournalEntries())
        ]);

        res.json({
            period,
            accounts: {
                totalBankTransactionsAmount: bankTotalRes.recordset[0]?.total || 0,
                bankTransactionCount: bankCountRes.recordset[0]?.total || 0,
                totalJournalEntries: journalRes.recordset[0]?.total || 0,
                activeAccountsCount: accountsRes.recordset[0]?.total || 0,
                latestJournals: latestJournalsRes.recordset || []
            }
        });
    } catch (err) {
        console.error('Accounts KPI error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
