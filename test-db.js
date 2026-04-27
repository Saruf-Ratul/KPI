/**
 * Database Connection Tester
 * Tests connectivity to all 9 databases on 12.168.2.10
 */
const sql = require('mssql');
require('dotenv').config();

const baseConfig = {
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 10000,
        connectionTimeout: 10000,
    },
};

const databases = {
    // Service DBs
    'CTG_3sSale': process.env.SERVICE_DB_CTG,
    'SSS_3sSale': process.env.SERVICE_DB_SSS,
    'Uttara_3sSale': process.env.SERVICE_DB_UTTARA,
    'Tejgaon_3sSale': process.env.SERVICE_DB_TEJGAON,
    // Parts DBs
    'CPD_CTG_SIMS': process.env.PARTS_DB_CPD_CTG,
    'CPD_Tejgaon_SIMS': process.env.PARTS_DB_CPD_TEJGAON,
    'NS_dbWS_IMS': process.env.PARTS_DB_NS,
    'dbDemra_SIMS': process.env.PARTS_DB_DEMRA,
    'dbUttara_SIMS': process.env.PARTS_DB_UTTARA,
};

console.log('============================================');
console.log('  KPI Dashboard — Database Connection Test');
console.log('============================================');
console.log(`Server: ${process.env.DB_SERVER}:${process.env.DB_PORT}`);
console.log(`User:   ${process.env.DB_USER}`);
console.log('--------------------------------------------\n');

async function testAll() {
    let passed = 0, failed = 0;

    for (const [label, dbName] of Object.entries(databases)) {
        process.stdout.write(`  Testing ${label.padEnd(22)} ... `);
        try {
            const pool = await new sql.ConnectionPool({ ...baseConfig, database: dbName }).connect();
            const result = await pool.request().query('SELECT 1 AS ok');
            if (result.recordset[0].ok === 1) {
                console.log('✅ CONNECTED');
                passed++;
            }
            await pool.close();
        } catch (err) {
            console.log(`❌ FAILED — ${err.message.substring(0, 80)}`);
            failed++;
        }
    }

    console.log('\n--------------------------------------------');
    console.log(`  Results: ${passed} connected, ${failed} failed (out of ${passed + failed})`);
    console.log('============================================');
    process.exit(failed > 0 ? 1 : 0);
}

testAll();
