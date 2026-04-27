# KPI Management Dashboard — Logic & Calculation Reference

This document outlines the exact logic, calculations, and database tables used for every KPI in the dashboard.

## Database Sources

The dashboard aggregates data across 10 databases:

**Service Databases (4):** (`192.168.2.10`)
- CTG_3sSale
- SSS_3sSale
- Uttara_3sSale
- Tejgaon_3sSale

**Parts Databases (5):** (`192.168.2.10`)
- CPD_CTG_SIMS
- CPD_Tejgaon_SIMS
- NS_dbWS_IMS
- dbDemra_SIMS
- dbUttara_SIMS

**Accounts & General Ledger (1):** (`192.168.2.12`)
- ServiceCenter_12

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
| **Jobs Working** | Count of open jobs actively being worked on | `tbJob`, `tbStallWorkTime` | Service |
| **Jobs Not Working** | Count of open jobs with no active work logs | `tbJob`, `tbStallWorkTime` | Service |
| **Jobs Open** | Count of non-cancelled jobs without a bill | `tbJob`, `tbBill` | Service |
| **Job Completion Rate** | `(Jobs Completed / Jobs Created) * 100` | Computed | Computed |
| **Bay-Wise Income** | Sum of payments grouped by bay number | `tbPayments`, `tbJob` (`Bay_No`) | Service |
| **Booking Time Comp.** | Actual completion time vs Promised time | `tbJob`, `H_Invoice_JOB` *(Legacy)* | Service |
| **Jobs per Tech** | `Total Jobs Worked / Total Technicians` | `tbStallWorkTime`, `tbJob` | Service |
| **Cancellation Rate** | `(Cancelled Jobs / Total Jobs Including Cancelled) * 100` | `tbJob` | Service |

---

## 3. Sales & Revenue

| KPI | Calculation Logic | Source Tables | Source Databases |
| :--- | :--- | :--- | :--- |
| **Total Revenue** | Sum of payments (Service) + Sum of counter sales (Parts) | Service: `tbPayments`<br>Parts: `tbFTrans_Dt`, `tbFTRans_MR` (RTrType=1, JobNO='') | All (Service & Parts) |
| **Service Revenue** | Sum of payments (`mPayment_Amt`) | `tbPayments` | Service |
| **Parts Revenue** | Sum of direct counter sales (`Rate * R_InvQty`) | `tbFTrans_Dt`, `tbFTRans_MR` (RTrType=1, JobNO='') | Parts |
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
| **Cost of Goods** | Service COGS + Parts COGS | Service: `tbPurchaseDetail`<br>Parts: `tbFTrans_Dt` (`WAvgPrice * R_InvQty`) | All (Service & Parts) |
| **Gross Profit** | `Total Revenue - Cost of Goods` | Computed | Computed |
| **Gross Profit Margin** | `(Gross Profit / Total Revenue) * 100` | Computed | Computed |
| **Net Profit** | `Total Revenue - Cost of Goods - Total Expense` | Computed | Computed |
| **Net Profit Margin** | `(Net Profit / Total Revenue) * 100` | Computed | Computed |
| **Cash Balance** | Sum of payments where mode is 'Cash' | `tbPayments` | Service |
| **Accounts Receivable** | Sum of customer due amounts | Service: `tbCustomer` (`mDue`)<br>Parts: `tbLedger` (`Balance` > 0) | All (Service & Parts) |
| **Accounts Payable** | Sum of negative balances | Parts: `tbLedger` (`Balance` < 0) | Parts |
| **Quick Ratio** | `(Cash Balance + Accounts Receivable) / Accounts Payable`| Computed | Computed |

---

## 5. Accounts & General Ledger

| KPI | Calculation Logic | Source Tables | Source Databases |
| :--- | :--- | :--- | :--- |
| **Bank Transactions Total** | Sum of double-entry bank transactions (Amount > 0) | `JournalDetail`, `JournalMaster` (`PayMode <> 'C'`) | Accounts |
| **Bank Transaction Count** | Count of bank journal master entries | `JournalMaster` (`PayMode <> 'C'`) | Accounts |
| **Journal Entries Total** | Count of all journal entries | `JournalMaster` | Accounts |
| **Active Ledger Accounts** | Count of active ledger accounts | `AccountList` | Accounts |
| **Latest Journal Entries** | Top 5 recent journal records | `JournalMaster` | Accounts |

---

## 6. Team / HR

| KPI | Calculation Logic | Source Tables | Source Databases |
| :--- | :--- | :--- | :--- |
| **Total Employees** | Service Employees + Parts Employees | `tbEmployee_Information` | All (Service & Parts) |
| **Service Employees** | Count of active employees | `tbEmployee_Information` (`Active_Tag=1`) | Service |
| **Parts Employees** | Count of all listed employees | `tbEmployee_Information` | Parts |
| **Employee by Role** | Group count by `Designation` | `tbEmployee_Information`, `tbDesignation` | Service |

---

## Technical Notes & Limitations
- **Job Completion Logic:** A job is considered "completed" if an entry exists in `tbBill` matching its `vJob_No`. The older `H_Invoice_JOB` table is no longer actively used for current billing records.
- **Parts Double Counting Prevention:** Parts revenue calculation strictly filters for `RTrType = 1` and `JobNO = ''` to prevent counting parts issued to Service Bay jobs (which are billed via `tbPayments`).
- **Cross-Database Aggregation:** When a KPI involves both Service and Parts, the Node.js backend queries all databases in parallel and sums the results in memory.
- **Double Entry Accounting:** Bank transactions calculate `SUM(Amount) WHERE Amount > 0` to circumvent double-entry ledgers zeroing out.
