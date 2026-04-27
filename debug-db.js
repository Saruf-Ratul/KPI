/**
 * Debug: Check what data exists in the databases
 */
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.SERVICE_DB_SSS, // test with SSS (largest DB)
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true, requestTimeout: 15000, connectionTimeout: 10000 },
};

async function debug() {
    const pool = await new sql.ConnectionPool(config).connect();
    console.log('Connected to', config.database, '\n');

    const queries = [
        // Check date ranges in key tables
        ['tbJob date range', `SELECT MIN(dDate) as minDate, MAX(dDate) as maxDate, COUNT(*) as total FROM tbJob`],
        ['tbJob by year', `SELECT YEAR(dDate) as yr, COUNT(*) as cnt FROM tbJob GROUP BY YEAR(dDate) ORDER BY yr DESC`],
        ['tbJob Cancelled stats', `SELECT Cancelled, COUNT(*) as cnt FROM tbJob GROUP BY Cancelled`],
        ['tbAppointment date range', `SELECT MIN(Schedule_Date) as minDate, MAX(Schedule_Date) as maxDate, COUNT(*) as total FROM tbAppointment`],
        ['tbEstimate date range', `SELECT MIN(dDate) as minDate, MAX(dDate) as maxDate, COUNT(*) as total FROM tbEstimate`],
        ['tbPayments date range', `SELECT MIN(dDate) as minDate, MAX(dDate) as maxDate, COUNT(*) as total, SUM(mPayment_Amt) as totalAmt FROM tbPayments`],
        ['tbBill date range', `SELECT MIN(dDate) as minDate, MAX(dDate) as maxDate, COUNT(*) as total FROM tbBill`],
        ['H_Invoice_JOB count', `SELECT COUNT(*) as total FROM H_Invoice_JOB`],
        ['tbStallWorkTime date range', `SELECT MIN(Work_Date) as minDate, MAX(Work_Date) as maxDate, COUNT(*) as total FROM tbStallWorkTime`],
        ['tbEmployee_Information active', `SELECT COUNT(*) as total, SUM(CASE WHEN Active_Tag=1 THEN 1 ELSE 0 END) as active FROM tbEmployee_Information`],
        ['tbCustomer due', `SELECT COUNT(*) as total, SUM(ISNULL(mDue,0)) as totalDue FROM tbCustomer`],
        // Test the actual query we use
        ['Our jobsCreated query (thisYear)', `SELECT COUNT(*) as total FROM tbJob WHERE Cancelled = 0 AND YEAR(dDate) = YEAR(GETDATE())`],
        ['Our revenue query (thisYear)', `SELECT ISNULL(SUM(mPayment_Amt), 0) as total FROM tbPayments WHERE YEAR(dDate) = YEAR(GETDATE())`],
        ['Server GETDATE', `SELECT GETDATE() as now, YEAR(GETDATE()) as currentYear`],
    ];

    for (const [label, query] of queries) {
        try {
            const result = await pool.request().query(query);
            console.log(`--- ${label} ---`);
            console.table(result.recordset);
        } catch (err) {
            console.log(`--- ${label} --- ERROR: ${err.message}`);
        }
        console.log('');
    }

    // Also check parts DB
    console.log('\n========== PARTS DB (CPD_CTG_SIMS) ==========\n');
    const partsPool = await new sql.ConnectionPool({
        ...config, database: process.env.PARTS_DB_CPD_CTG
    }).connect();

    const partsQueries = [
        ['tbFTRans_MR date range', `SELECT MIN(RTrDate) as minDate, MAX(RTrDate) as maxDate, COUNT(*) as total FROM tbFTRans_MR`],
        ['tbFTrans_Dt count', `SELECT COUNT(*) as total FROM tbFTrans_Dt`],
        ['Parts revenue (thisYear)', `SELECT ISNULL(SUM(dt.Rate * dt.R_InvQty), 0) as total FROM tbFTrans_Dt dt INNER JOIN tbFTRans_MR mr ON mr.RTrID = dt.RTrID WHERE mr.RTrType = 2 AND YEAR(mr.RTrDate) = YEAR(GETDATE())`],
        ['tbEmployee_Information count', `SELECT COUNT(*) as total FROM tbEmployee_Information`],
    ];

    for (const [label, query] of partsQueries) {
        try {
            const result = await partsPool.request().query(query);
            console.log(`--- ${label} ---`);
            console.table(result.recordset);
        } catch (err) {
            console.log(`--- ${label} --- ERROR: ${err.message}`);
        }
        console.log('');
    }

    await pool.close();
    await partsPool.close();
    process.exit(0);
}

debug().catch(err => { console.error(err); process.exit(1); });
