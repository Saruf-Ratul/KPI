const { getDateFilter } = require('./serviceQueries');

// Since we don't have exact AccountCodes, we will query general table health and totals
// to demonstrate the integration of NVToyota_12.

function totalBankTransactions(period) {
    return `SELECT ISNULL(SUM(d.Amount), 0) as total 
            FROM JournalDetail d
            INNER JOIN JournalMaster m ON m.SlNo = d.SlNo
            WHERE m.PayMode <> 'C' AND d.Amount > 0
            AND ${getDateFilter(period, 'm.TransactionDate')}`;
}

function bankTransactionCount(period) {
    return `SELECT COUNT(*) as total 
            FROM JournalMaster 
            WHERE PayMode <> 'C' 
            AND ${getDateFilter(period, 'TransactionDate')}`;
}

function totalJournalEntries(period) {
    return `SELECT COUNT(*) as total FROM JournalMaster WHERE ${getDateFilter(period, 'TransactionDate')}`;
}

function latestJournalEntries() {
    return `SELECT TOP 5 VoucherNo, TransactionDate, UserName, CostCentreId FROM JournalMaster ORDER BY TransactionDate DESC`;
}

function totalCostOfGoods(period) {
    // CostofGoods doesn't have a date column in ServiceCenter_12
    return `SELECT ISNULL(SUM(Amount), 0) as total FROM CostofGoods`; 
}

function activeAccountsCount() {
    return `SELECT COUNT(*) as total FROM AccountList`;
}

module.exports = {
    totalBankTransactions,
    bankTransactionCount,
    totalJournalEntries,
    latestJournalEntries,
    totalCostOfGoods,
    activeAccountsCount,
};
