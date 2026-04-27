/**
 * Service Database SQL Query Builders
 * Builds date-filtered queries for the 4 service databases
 */

/**
 * Generate WHERE clause for date filtering
 */
function getDateFilter(periodInput, dateColumn = 'dDate') {
    let period = periodInput;
    let startDate, endDate;
    
    if (typeof periodInput === 'object') {
        period = periodInput.period;
        startDate = periodInput.startDate;
        endDate = periodInput.endDate;
    }

    switch (period) {
        case 'custom':
            if (startDate && endDate) {
                return `${dateColumn} >= '${startDate} 00:00:00' AND ${dateColumn} <= '${endDate} 23:59:59'`;
            }
            return `YEAR(${dateColumn}) = YEAR(GETDATE())`;
        case 'today':
            return `CAST(${dateColumn} AS DATE) = CAST(GETDATE() AS DATE)`;
        case 'thisWeek':
            return `${dateColumn} >= DATEADD(DAY, 1-DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE)) AND ${dateColumn} < DATEADD(DAY, 8-DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))`;
        case 'thisMonth':
            return `YEAR(${dateColumn}) = YEAR(GETDATE()) AND MONTH(${dateColumn}) = MONTH(GETDATE())`;
        case 'thisYear':
            return `YEAR(${dateColumn}) = YEAR(GETDATE())`;
        case 'ytd':
            return `${dateColumn} >= DATEFROMPARTS(YEAR(GETDATE()),1,1) AND ${dateColumn} <= GETDATE()`;
        case 'thisQuarter':
            return `YEAR(${dateColumn}) = YEAR(GETDATE()) AND DATEPART(QUARTER, ${dateColumn}) = DATEPART(QUARTER, GETDATE())`;
        case 'lastMonth':
            return `YEAR(${dateColumn}) = YEAR(DATEADD(MONTH,-1,GETDATE())) AND MONTH(${dateColumn}) = MONTH(DATEADD(MONTH,-1,GETDATE()))`;
        case 'lastYear':
            return `YEAR(${dateColumn}) = YEAR(GETDATE()) - 1`;
        case 'lastYearQuarter':
            return `YEAR(${dateColumn}) = YEAR(GETDATE())-1 AND DATEPART(QUARTER, ${dateColumn}) = DATEPART(QUARTER, GETDATE())`;
        case 'lastYearYTD':
            return `${dateColumn} >= DATEFROMPARTS(YEAR(GETDATE())-1,1,1) AND ${dateColumn} <= DATEADD(YEAR,-1,GETDATE())`;
        default:
            return `YEAR(${dateColumn}) = YEAR(GETDATE())`;
    }
}

/**
 * Get the comparison period for trend analysis
 */
function getComparisonDateFilter(period, dateColumn = 'dDate') {
    switch (period) {
        case 'today':
            return `CAST(${dateColumn} AS DATE) = DATEADD(DAY, -1, CAST(GETDATE() AS DATE))`;
        case 'thisWeek':
            return `${dateColumn} >= DATEADD(WEEK, -1, DATEADD(DAY, 1-DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))) AND ${dateColumn} < DATEADD(DAY, 1-DATEPART(WEEKDAY, GETDATE()), CAST(GETDATE() AS DATE))`;
        case 'thisMonth':
            return `YEAR(${dateColumn}) = YEAR(DATEADD(MONTH,-1,GETDATE())) AND MONTH(${dateColumn}) = MONTH(DATEADD(MONTH,-1,GETDATE()))`;
        case 'thisYear':
        case 'ytd':
            return `YEAR(${dateColumn}) = YEAR(GETDATE()) - 1`;
        case 'thisQuarter':
            return `DATEPART(QUARTER, ${dateColumn}) = DATEPART(QUARTER, DATEADD(QUARTER,-1,GETDATE())) AND YEAR(${dateColumn}) = YEAR(DATEADD(QUARTER,-1,GETDATE()))`;
        case 'lastMonth':
            return `YEAR(${dateColumn}) = YEAR(DATEADD(MONTH,-2,GETDATE())) AND MONTH(${dateColumn}) = MONTH(DATEADD(MONTH,-2,GETDATE()))`;
        case 'lastYear':
            return `YEAR(${dateColumn}) = YEAR(GETDATE()) - 2`;
        default:
            return `YEAR(${dateColumn}) = YEAR(GETDATE()) - 1`;
    }
}

// === OPERATIONS QUERIES ===

function appointmentRequests(period) {
    return `SELECT COUNT(*) as total FROM tbAppointment WHERE ${getDateFilter(period, 'Schedule_Date')}`;
}

function proposalsCreated(period) {
    return `SELECT COUNT(*) as total FROM tbEstimate WHERE ${getDateFilter(period, 'dDate')}`;
}

function proposalsOutstanding(period) {
    return `SELECT COUNT(*) as total FROM tbEstimate e
            WHERE ${getDateFilter(period, 'e.dDate')}
            AND NOT EXISTS (SELECT 1 FROM tbJob j WHERE j.vEst_No = e.vEst_No AND j.Cancelled = 0)`;
}

function jobsCreated(period) {
    return `SELECT COUNT(*) as total FROM tbJob WHERE Cancelled = 0 AND ${getDateFilter(period, 'dDate')}`;
}

function jobsScheduled(period) {
    return `SELECT COUNT(DISTINCT j.vJob_No) as total 
            FROM tbJob j 
            INNER JOIN tbSchedule s ON EXISTS (
                SELECT 1 FROM tbStallWorkTime sw WHERE sw.vJob_No = j.vJob_No
            )
            WHERE j.Cancelled = 0 AND ${getDateFilter(period, 'j.dDate')}`;
}

function jobsCompleted(period) {
    return `SELECT COUNT(DISTINCT j.vJob_No) as total 
            FROM tbJob j 
            INNER JOIN tbBill b ON b.vJob_No = j.vJob_No
            WHERE j.Cancelled = 0 AND ${getDateFilter(period, 'j.dDate')}`;
}

function jobsWorked(period) {
    return `SELECT COUNT(DISTINCT sw.vJob_No) as total 
            FROM tbStallWorkTime sw
            INNER JOIN tbJob j ON j.vJob_No = sw.vJob_No
            WHERE j.Cancelled = 0 AND ${getDateFilter(period, 'sw.Work_Date')}`;
}

function jobsOpen(period) {
    return `SELECT COUNT(*) as total FROM tbJob j 
            WHERE j.Cancelled = 0 
            AND ${getDateFilter(period, 'j.dDate')}
            AND NOT EXISTS (SELECT 1 FROM tbBill b WHERE b.vJob_No = j.vJob_No)`;
}

function jobsCancelled(period) {
    return `SELECT COUNT(*) as total FROM tbJob WHERE Cancelled = 1 AND ${getDateFilter(period, 'dDate')}`;
}

function totalJobsIncCancelled(period) {
    return `SELECT COUNT(*) as total FROM tbJob WHERE ${getDateFilter(period, 'dDate')}`;
}

function jobsPerTech(period) {
    return `SELECT 
                COUNT(DISTINCT sw.vJob_No) as totalJobs,
                COUNT(DISTINCT sw.EMPID) as totalTechs,
                CASE WHEN COUNT(DISTINCT sw.EMPID) > 0 
                     THEN CAST(COUNT(DISTINCT sw.vJob_No) AS FLOAT) / COUNT(DISTINCT sw.EMPID) 
                     ELSE 0 END as ratio
            FROM tbStallWorkTime sw
            INNER JOIN tbJob j ON j.vJob_No = sw.vJob_No
            WHERE j.Cancelled = 0 AND ${getDateFilter(period, 'sw.Work_Date')}`;
}

function bookingTimeCompletion(period) {
    return `SELECT 
                AVG(DATEDIFF(MINUTE, j.Receive_Time, j.Promised_Time)) as avgPromisedMinutes,
                AVG(DATEDIFF(MINUTE, j.Receive_Time, b.dDate)) as avgActualMinutes,
                COUNT(*) as total
            FROM tbJob j
            INNER JOIN tbBill b ON b.vJob_No = j.vJob_No
            WHERE j.Cancelled = 0 
            AND j.Receive_Time IS NOT NULL 
            AND j.Promised_Time IS NOT NULL
            AND ${getDateFilter(period, 'j.dDate')}`;
}

// === SALES / REVENUE QUERIES ===

function serviceRevenue(period) {
    return `SELECT ISNULL(SUM(p.mPayment_Amt), 0) as total
            FROM tbPayments p
            WHERE ${getDateFilter(period, 'p.dDate')}`;
}

function serviceRevenueByMonth(period) {
    return `SELECT 
                YEAR(p.dDate) as yr, 
                MONTH(p.dDate) as mo, 
                ISNULL(SUM(p.mPayment_Amt), 0) as total
            FROM tbPayments p
            WHERE ${getDateFilter(period, 'p.dDate')}
            GROUP BY YEAR(p.dDate), MONTH(p.dDate)
            ORDER BY yr, mo`;
}

function serviceExpense(period) {
    return `SELECT ISNULL(SUM(pd.mP_Price * pd.nQty), 0) as total
            FROM tbPurchaseDetail pd
            INNER JOIN tbPurchase pu ON pu.Mrr_No = pd.Mrr_No
            WHERE ${getDateFilter(period, 'pu.dPDate')}`;
}

function averageQuoteValue(period) {
    return `SELECT ISNULL(AVG(mAmount), 0) as total FROM tbEstimate 
            WHERE mAmount > 0 AND ${getDateFilter(period, 'dDate')}`;
}

function revenueByCustomerType(period) {
    return `SELECT 
                ISNULL(j.CType, 'Unknown') as customerType,
                ISNULL(SUM(p.mPayment_Amt), 0) as total
            FROM tbPayments p
            INNER JOIN tbJob j ON j.vJob_No = p.vJob_No
            WHERE ${getDateFilter(period, 'p.dDate')}
            GROUP BY j.CType
            ORDER BY total DESC`;
}

function revenuePerTech(period) {
    return `SELECT 
                ISNULL(SUM(p.mPayment_Amt), 0) as totalRevenue,
                COUNT(DISTINCT sw.EMPID) as totalTechs,
                CASE WHEN COUNT(DISTINCT sw.EMPID) > 0 
                     THEN SUM(p.mPayment_Amt) / COUNT(DISTINCT sw.EMPID) 
                     ELSE 0 END as ratio
            FROM tbPayments p
            INNER JOIN tbStallWorkTime sw ON sw.vJob_No = p.vJob_No
            WHERE ${getDateFilter(period, 'p.dDate')}`;
}

// === FINANCIAL QUERIES ===

function serviceCOGS(period) {
    return `SELECT ISNULL(SUM(pd.mP_Price * pd.nQty), 0) as total
            FROM tbPurchaseDetail pd
            INNER JOIN tbPurchase pu ON pu.Mrr_No = pd.Mrr_No
            WHERE ${getDateFilter(period, 'pu.dPDate')}`;
}

function cashBalance(period) {
    return `SELECT ISNULL(SUM(mPayment_Amt), 0) as total
            FROM tbPayments
            WHERE vPayment_Mode LIKE '%Cash%'
            AND ${getDateFilter(period, 'dDate')}`;
}

function accountsReceivable() {
    return `SELECT ISNULL(SUM(ISNULL(mDue, 0)), 0) as total FROM tbCustomer WHERE ISNULL(mDue, 0) > 0`;
}

function laborRevenue(period) {
    return `SELECT ISNULL(SUM(sd.Rate), 0) as total
            FROM tbService_Details sd
            INNER JOIN tbJob j ON j.vJob_No = sd.vJob_No
            WHERE j.Cancelled = 0 AND ${getDateFilter(period, 'j.dDate')}`;
}

function averageJobValue(period) {
    return `SELECT 
                ISNULL(SUM(p.mPayment_Amt), 0) as totalRev,
                COUNT(DISTINCT p.vJob_No) as totalJobs,
                CASE WHEN COUNT(DISTINCT p.vJob_No) > 0 
                     THEN SUM(p.mPayment_Amt) / COUNT(DISTINCT p.vJob_No) 
                     ELSE 0 END as avgValue
            FROM tbPayments p
            WHERE ${getDateFilter(period, 'p.dDate')}`;
}

// === HR QUERIES ===

function employeeCountByRole() {
    return `SELECT 
                d.Designation as role,
                COUNT(*) as total
            FROM tbEmployee_Information ei
            INNER JOIN tbDesignation d ON d.Desig_ID = ei.Desig_ID
            WHERE ISNULL(ei.Active_Tag, 1) = 1
            GROUP BY d.Designation
            ORDER BY total DESC`;
}

function activeEmployeeCount() {
    return `SELECT COUNT(*) as total FROM tbEmployee_Information WHERE ISNULL(Active_Tag, 1) = 1`;
}

function activeTechnicianCount() {
    return `SELECT COUNT(*) as total FROM tbEmployee_Information 
            WHERE ISNULL(Active_Tag, 1) = 1 
            AND Desig_ID IN (SELECT Desig_ID FROM tbDesignation WHERE Designation LIKE '%Tech%' OR Designation LIKE '%Mechanic%')`;
}

module.exports = {
    getDateFilter,
    getComparisonDateFilter,
    appointmentRequests,
    proposalsCreated,
    proposalsOutstanding,
    jobsCreated,
    jobsScheduled,
    jobsCompleted,
    jobsWorked,
    jobsOpen,
    jobsCancelled,
    totalJobsIncCancelled,
    jobsPerTech,
    bookingTimeCompletion,
    serviceRevenue,
    serviceRevenueByMonth,
    serviceExpense,
    averageQuoteValue,
    revenueByCustomerType,
    revenuePerTech,
    serviceCOGS,
    cashBalance,
    accountsReceivable,
    laborRevenue,
    averageJobValue,
    employeeCountByRole,
    activeEmployeeCount,
    activeTechnicianCount,
};
