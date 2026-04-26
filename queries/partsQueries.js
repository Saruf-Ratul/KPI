/**
 * Parts Database SQL Query Builders
 * Builds queries for the 5 spare parts databases
 */

const { getDateFilter } = require('./serviceQueries');

// === PARTS REVENUE (Sales/Issues) ===

function partsRevenue(period) {
    return `SELECT ISNULL(SUM(dt.Rate * dt.R_InvQty), 0) as total
            FROM tbFTrans_Dt dt
            INNER JOIN tbFTRans_MR mr ON mr.RTrID = dt.RTrID
            WHERE mr.RTrType = 2
            AND ${getDateFilter(period, 'mr.RTrDate')}`;
}

function partsRevenueByMonth(period) {
    return `SELECT 
                YEAR(mr.RTrDate) as yr, 
                MONTH(mr.RTrDate) as mo,
                ISNULL(SUM(dt.Rate * dt.R_InvQty), 0) as total
            FROM tbFTrans_Dt dt
            INNER JOIN tbFTRans_MR mr ON mr.RTrID = dt.RTrID
            WHERE mr.RTrType = 2
            AND ${getDateFilter(period, 'mr.RTrDate')}
            GROUP BY YEAR(mr.RTrDate), MONTH(mr.RTrDate)
            ORDER BY yr, mo`;
}

function partsCOGS(period) {
    return `SELECT ISNULL(SUM(dt.WAvgPrice * dt.R_InvQty), 0) as total
            FROM tbFTrans_Dt dt
            INNER JOIN tbFTRans_MR mr ON mr.RTrID = dt.RTrID
            WHERE mr.RTrType = 2
            AND ${getDateFilter(period, 'mr.RTrDate')}`;
}

function partsExpense(period) {
    return `SELECT ISNULL(SUM(dt.RUnitPrice * dt.R_InvQty), 0) as total
            FROM tbFTrans_Dt dt
            INNER JOIN tbFTRans_MR mr ON mr.RTrID = dt.RTrID
            WHERE mr.RTrType = 1
            AND ${getDateFilter(period, 'mr.RTrDate')}`;
}

function partsAccountsReceivable() {
    return `SELECT ISNULL(SUM(Balance), 0) as total FROM tbLedger WHERE ISNULL(Balance, 0) > 0`;
}

function partsAccountsPayable() {
    return `SELECT ISNULL(SUM(Balance), 0) as total FROM tbLedger WHERE ISNULL(Balance, 0) < 0`;
}

function partsEmployeeCount() {
    return `SELECT COUNT(*) as total FROM tbEmployee_Information`;
}

function partsRevenueByCustomerType(period) {
    return `SELECT 
                ISNULL(mr.Cust_Type, 'Unknown') as customerType,
                ISNULL(SUM(dt.Rate * dt.R_InvQty), 0) as total
            FROM tbFTrans_Dt dt
            INNER JOIN tbFTRans_MR mr ON mr.RTrID = dt.RTrID
            WHERE mr.RTrType = 2
            AND ${getDateFilter(period, 'mr.RTrDate')}
            GROUP BY mr.Cust_Type
            ORDER BY total DESC`;
}

module.exports = {
    partsRevenue,
    partsRevenueByMonth,
    partsCOGS,
    partsExpense,
    partsAccountsReceivable,
    partsAccountsPayable,
    partsEmployeeCount,
    partsRevenueByCustomerType,
};
