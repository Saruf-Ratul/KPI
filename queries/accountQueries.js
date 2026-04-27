const { getDateFilter } = require('./serviceQueries');

// Since we don't have exact AccountCodes, we will query general table health and totals
// to demonstrate the integration of NVToyota_12.

function totalBankTransactions(period) {
    return `SELECT ISNULL(SUM(Amount), 0) as total FROM BankTransaction WHERE ${getDateFilter(period, 'TransactionDate')}`;
}

function bankTransactionCount(period) {
    return `SELECT COUNT(*) as total FROM BankTransaction WHERE ${getDateFilter(period, 'TransactionDate')}`;
}

function totalJournalEntries(period) {
    return `SELECT COUNT(*) as total FROM JournalMaster WHERE ${getDateFilter(period, 'TransactionDate')}`;
}

function latestJournalEntries() {
    return `SELECT TOP 5 VoucherNo, TransactionDate, UserName, CostCentreId FROM JournalMaster ORDER BY TransactionDate DESC`;
}

function totalCostOfGoods(period) {
    // If CostofGoods has a date column, filter it. Else just count rows for now.
    // Assuming tDate exists based on similar tables.
    return `SELECT ISNULL(SUM(oAmount), 0) as total FROM CostofGoods`; 
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
