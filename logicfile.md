# KPI Management Dashboard — Logic & Calculation Reference

This document outlines the exact logic, calculations, and database tables used for every KPI in the dashboard.

## Database Sources

The dashboard aggregates data across 9 databases on the `192.168.2.10` server:

**Service Databases (4):**
- CTG_3sSale
- SSS_3sSale
- Uttara_3sSale
- Tejgaon_3sSale

**Parts Databases (5):**
- CPD_CTG_SIMS
- CPD_Tejgaon_SIMS
- NS_dbWS_IMS
- dbDemra_SIMS
- dbUttara_SIMS

---

## 1. Dashboard Overview

| KPI | Calculation Logic | Source Tables | Source Databases |
| :--- | :--- | :--- | :--- |
| **Total Revenue** | Service Revenue + Parts Revenue | `tbPayments`, `tbFTrans_Dt`, `tbFTRans_MR` | All (Service & Parts) |
| **Gross Profit** | Total Revenue - Cost of Goods | `tbPayments`, `tbFTrans_Dt`, `tbFTRans_MR`, `tbPurchase`, `tbPurchaseDetail` | All (Service & Parts) |
| **Gross Profit Margin** | `(Gross Profit / Total Revenue) * 100` | Computed | Computed |
| **Jobs Created** | Count of all non-cancelled jobs within period | `tbJob` | Service |
| **Jobs Completed** | Count of jobs that have an associated bill | `tbJob`, `tbBill` | Service |
| **Jobs Open** | Count of non-cancelled jobs without an associated bill | `tbJob`, `tbBill` | Service |
| **Job Completion Rate** | `(Jobs Completed / Jobs Created) * 100` | Computed | Computed |
| **Appointment Requests**| Count of scheduled appointments | `tbAppointment` | Service |
| **Total Employees** | Active Service Employees + Parts Employees | `tbEmployee_Information` | All (Service & Parts) |
| **Cancellation Rate** | `(Cancelled Jobs / Total Jobs Including Cancelled) * 100` | `tbJob` | Service |

---

## 2. Operations Dashboard

| KPI | Calculation Logic | Source Tables | Source Databases |
| :--- | :--- | :--- | :--- |
| **Appointment Requests**| Count of scheduled appointments | `tbAppointment` | Service |
| **Proposals Created** | Count of estimates created | `tbEstimate` | Service |
| **Proposals Outstanding**| Count of estimates not linked to a non-cancelled job | `tbEstimate`, `tbJob` | Service |
| **Jobs Created** | Count of non-cancelled jobs | `tbJob` | Service |
| **Jobs Scheduled** | Count of jobs with work time entries | `tbJob`, `tbSchedule`, `tbStallWorkTime` | Service |
| **Jobs Completed** | Count of jobs linked to a bill | `tbJob`, `tbBill` | Service |
| **Jobs Worked** | Count of distinct jobs with time logged | `tbStallWorkTime`, `tbJob` | Service |
| **Jobs Open** | Count of non-cancelled jobs without a bill | `tbJob`, `tbBill` | Service |
| **Job Completion Rate** | `(Jobs Completed / Jobs Created) * 100` | Computed | Computed |
| **Booking Time Comp.** | Actual completion time vs Promised time | `tbJob`, `H_Invoice_JOB` *(Legacy table used for historical comparison logic if available)* | Service |
| **Jobs per Tech** | `Total Jobs Worked / Total Technicians` | `tbStallWorkTime`, `tbJob` | Service |
| **Cancellation Rate** | `(Cancelled Jobs / Total Jobs Including Cancelled) * 100` | `tbJob` | Service |

---

## 3. Sales & Revenue

| KPI | Calculation Logic | Source Tables | Source Databases |
| :--- | :--- | :--- | :--- |
| **Total Revenue** | Sum of payments (Service) + Sum of invoiced items (Parts) | Service: `tbPayments`<br>Parts: `tbFTrans_Dt`, `tbFTRans_MR` (RTrType=2) | All (Service & Parts) |
| **Service Revenue** | Sum of payments (`mPayment_Amt`) | `tbPayments` | Service |
| **Parts Revenue** | Sum of invoiced items (`Rate * R_InvQty`) | `tbFTrans_Dt`, `tbFTRans_MR` (RTrType=2) | Parts |
| **Month to Date Rev.** | Total Revenue for current month | Same as Total Revenue | All (Service & Parts) |
| **Last Month's Rev.** | Total Revenue for previous month | Same as Total Revenue | All (Service & Parts) |
| **Total Expense** | Service Purchases + Parts Purchases | Service: `tbPurchaseDetail`, `tbPurchase`<br>Parts: `tbFTrans_Dt`, `tbFTRans_MR` (RTrType=1) | All (Service & Parts) |
| **Cancellation Rate** | `(Cancelled Jobs / Total Jobs Including Cancelled) * 100` | `tbJob` | Service |
| **Average Quote Value** | Average of estimate amounts (`mAmount`) | `tbEstimate` | Service |
| **Revenue per Tech** | `Total Service Revenue / Active Technicians` | `tbPayments`, `tbStallWorkTime` | Service |
| **Revenue Growth(YoY)** | `((This Year Rev - Last Year Rev) / Last Year Rev) * 100` | Computed | Computed |

---

## 4. Financial Ratios

| KPI | Calculation Logic | Source Tables | Source Databases |
| :--- | :--- | :--- | :--- |
| **Total Revenue** | Service Revenue + Parts Revenue | Same as above | All (Service & Parts) |
| **Month to Date Rev.** | Total Revenue for current month | Same as above | All (Service & Parts) |
| **Last Month's Rev.** | Total Revenue for previous month | Same as above | All (Service & Parts) |
| **Cost of Goods** | Service COGS + Parts COGS | Service: `tbPurchaseDetail` (`mP_Price * nQty`)<br>Parts: `tbFTrans_Dt` (`WAvgPrice * R_InvQty`) | All (Service & Parts) |
| **Gross Profit** | `Total Revenue - Cost of Goods` | Computed | Computed |
| **Gross Profit Margin** | `(Gross Profit / Total Revenue) * 100` | Computed | Computed |
| **Net Profit** | `Total Revenue - Cost of Goods - Total Expense` | Computed | Computed |
| **Net Profit Margin** | `(Net Profit / Total Revenue) * 100` | Computed | Computed |
| **Profit Margin in ৳** | Same as Gross Profit | Computed | Computed |
| **Profit Margin %** | Same as Gross Profit Margin | Computed | Computed |
| **Cash Balance** | Sum of payments where mode is 'Cash' | `tbPayments` | Service |
| **Accounts Receivable** | Sum of customer due amounts | Service: `tbCustomer` (`mDue`)<br>Parts: `tbLedger` (`Balance` > 0) | All (Service & Parts) |
| **Accounts Payable** | Sum of negative balances | Parts: `tbLedger` (`Balance` < 0) | Parts |
| **Revenue per Employee**| `Total Revenue / Total Employees` | Computed | Computed |
| **Quick Ratio** | `(Cash Balance + Accounts Receivable) / Accounts Payable`| Computed | Computed |
| **Labor Cost Percentage**| `(Labor Revenue / Total Revenue) * 100` | `tbService_Details` (`Rate`), `tbJob` | Service |
| **Average Job Value** | `Total Service Revenue / Distinct Jobs with Payments` | `tbPayments` | Service |
| **Revenue Growth(YoY)** | `((This Year Rev - Last Year Rev) / Last Year Rev) * 100` | Computed | Computed |

---

## 5. Team / HR

| KPI | Calculation Logic | Source Tables | Source Databases |
| :--- | :--- | :--- | :--- |
| **Total Employees** | Service Employees + Parts Employees | `tbEmployee_Information` | All (Service & Parts) |
| **Service Employees** | Count of active employees | `tbEmployee_Information` (`Active_Tag=1`) | Service |
| **Parts Employees** | Count of all listed employees | `tbEmployee_Information` | Parts |
| **Employee by Role** | Group count by `Designation` | `tbEmployee_Information`, `tbDesignation` | Service |

---

## Technical Notes & Limitations
- **Job Completion Logic:** A job is considered "completed" if an entry exists in `tbBill` matching its `vJob_No`. The older `H_Invoice_JOB` table is no longer actively used for current billing records.
- **Cross-Database Aggregation:** When a KPI involves both Service and Parts, the Node.js backend queries all 9 databases in parallel and sums the results in memory.
- **Dates and Periods:** Date filtering logic uses standard SQL Server `DATEPART`, `GETDATE()`, and similar functions to aggregate dynamically based on the requested period (e.g., "This Year", "Last Month").
