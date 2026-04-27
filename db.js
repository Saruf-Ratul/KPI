const sql = require('mssql');
require('dotenv').config();

// Base config shared by all connections
const baseConfig = {
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 15000,
    },
    pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

// Database name mapping
const SERVICE_DBS = {
    CTG: process.env.SERVICE_DB_CTG || 'CTG_3sSale',
    SSS: process.env.SERVICE_DB_SSS || 'SSS_3sSale',
    Uttara: process.env.SERVICE_DB_UTTARA || 'Uttara_3sSale',
    Tejgaon: process.env.SERVICE_DB_TEJGAON || 'Tejgaon_3sSale',
};

const PARTS_DBS = {
    CPD_CTG: process.env.PARTS_DB_CPD_CTG || 'CPD_CTG_SIMS',
    CPD_Tejgaon: process.env.PARTS_DB_CPD_TEJGAON || 'CPD_Tejgaon_SIMS',
    NS: process.env.PARTS_DB_NS || 'NS_dbWS_IMS',
    Demra: process.env.PARTS_DB_DEMRA || 'dbDemra_SIMS',
    Uttara: process.env.PARTS_DB_UTTARA || 'dbUttara_SIMS',
};

const ACCOUNTS_DB = process.env.ACCOUNTS_DB || 'ServiceCenter_12';

// Connection pool cache
const pools = {};

/**
 * Get or create a connection pool for a specific database
 */
async function getPool(dbName) {
    if (pools[dbName] && pools[dbName].connected) {
        return pools[dbName];
    }
    try {
        let config = { ...baseConfig, database: dbName };
        
        // Use a different server for the accounts database
        if (dbName === ACCOUNTS_DB) {
            config.server = process.env.ACCOUNTS_DB_SERVER || '192.168.2.12';
            config.user = process.env.ACCOUNTS_DB_USER || 'dbAshraf';
            config.password = process.env.ACCOUNTS_DB_PASSWORD || 'dbAdmin&navana&6395';
        }

        const pool = await new sql.ConnectionPool(config).connect();
        pools[dbName] = pool;
        console.log(`✅ Connected to ${dbName}`);
        return pool;
    } catch (err) {
        console.error(`❌ Failed to connect to ${dbName}:`, err.message);
        return null;
    }
}

/**
 * Execute a query against a specific database
 */
async function executeQuery(dbName, query, params = {}) {
    const pool = await getPool(dbName);
    if (!pool) return { recordset: [], error: `Cannot connect to ${dbName}` };
    try {
        const request = pool.request();
        // Add parameters
        for (const [key, val] of Object.entries(params)) {
            request.input(key, val);
        }
        const result = await request.query(query);
        return { recordset: result.recordset, rowsAffected: result.rowsAffected };
    } catch (err) {
        console.error(`Query error on ${dbName}:`, err.message);
        return { recordset: [], error: err.message };
    }
}

/**
 * Execute query across all service databases and combine results
 */
async function queryAllServiceDBs(queryFn) {
    const results = {};
    for (const [key, dbName] of Object.entries(SERVICE_DBS)) {
        try {
            const query = typeof queryFn === 'function' ? queryFn(key) : queryFn;
            results[key] = await executeQuery(dbName, query);
        } catch (err) {
            results[key] = { recordset: [], error: err.message };
        }
    }
    return results;
}

/**
 * Execute query across all parts databases and combine results
 */
async function queryAllPartsDBs(queryFn) {
    const results = {};
    for (const [key, dbName] of Object.entries(PARTS_DBS)) {
        try {
            const query = typeof queryFn === 'function' ? queryFn(key) : queryFn;
            results[key] = await executeQuery(dbName, query);
        } catch (err) {
            results[key] = { recordset: [], error: err.message };
        }
    }
    return results;
}

/**
 * Sum a numeric field from multi-db results
 */
function sumField(multiResults, field = 'total') {
    let sum = 0;
    for (const [, result] of Object.entries(multiResults)) {
        if (result.recordset && result.recordset.length > 0) {
            sum += result.recordset[0][field] || 0;
        }
    }
    return sum;
}

/**
 * Close all connection pools
 */
async function closeAll() {
    for (const [name, pool] of Object.entries(pools)) {
        try {
            await pool.close();
            console.log(`Closed pool: ${name}`);
        } catch (e) { /* ignore */ }
    }
}

/**
 * Execute query against the Accounts database
 */
async function queryAccountsDB(query, params = {}) {
    return await executeQuery(ACCOUNTS_DB, query, params);
}

module.exports = {
    sql,
    getPool,
    executeQuery,
    queryAllServiceDBs,
    queryAllPartsDBs,
    queryAccountsDB,
    sumField,
    closeAll,
    SERVICE_DBS,
    PARTS_DBS,
    ACCOUNTS_DB,
};
