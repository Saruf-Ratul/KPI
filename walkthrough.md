# KPI Management Dashboard — Walkthrough

## What Was Built

A full-stack **Power BI-style KPI Management Dashboard** connecting to **9 MSSQL databases** (4 service + 5 parts) with a premium dark-theme glassmorphism UI.

## Architecture

```
d:\SVC\KPI\
├── .env                          # DB credentials & config
├── server.js                     # Express server entry point
├── db.js                         # MSSQL connection pool manager (9 DBs)
├── package.json                  # Node.js project config
├── routes/
│   └── kpi.js                    # 7 API endpoints for all KPI categories
├── queries/
│   ├── serviceQueries.js         # SQL builders for 4 service DBs
│   └── partsQueries.js           # SQL builders for 5 parts DBs
└── public/
    ├── index.html                # Single-page dashboard app
    ├── css/styles.css            # Dark glassmorphism design system
    └── js/
        ├── app.js                # Main app controller & data binding
        └── charts.js             # Chart.js wrapper (line, bar, doughnut)
```

### System Architecture & Database Flow

```mermaid
graph TD
    %% Styling
    classDef client fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff
    classDef server fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff
    classDef opDB fill:#14b8a6,stroke:#0f766e,stroke-width:2px,color:#fff
    classDef accDB fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff

    subgraph Client ["Client Side (Browser)"]
        UI["Dashboard UI (index.html, app.js)"]:::client
        Charts["Chart.js Data Viz"]:::client
    end

    subgraph Backend ["Node.js Backend"]
        API["Express API (routes/kpi.js)"]:::server
        
        subgraph Queries ["Query Builders"]
            S_Query["Service Queries"]:::server
            P_Query["Parts Queries"]:::server
            A_Query["Accounts Logic"]:::server
        end
        
        Pool["DB Connection Pool (db.js)"]:::server
    end

    subgraph Server1 ["Operational Server (192.168.2.10)"]
        SDB[("4 Service DBs<br>tbPayments, tbJob_Master")]:::opDB
        PDB[("5 Parts DBs<br>tbFTRans_MR, tbFTrans_Dt")]:::opDB
    end

    subgraph Server2 ["Accounting Server (192.168.3.7)"]
        ADB[("NVToyota_12 DB<br>General Ledger, Journals")]:::accDB
    end

    %% Flow
    UI -->|"1. Request Data (Date Filters)"| API
    UI -.->|"Render"| Charts
    API -->|"2. Build SQL"| S_Query
    API -->|"2. Build SQL"| P_Query
    API -->|"2. Build SQL"| A_Query

    S_Query -->|"3. Execute"| Pool
    P_Query -->|"3. Execute"| Pool
    A_Query -->|"3. Execute"| Pool

    Pool -->|"4. Fetch Data"| SDB
    Pool -->|"4. Fetch Data"| PDB
    Pool -->|"4. Fetch Data"| ADB
```

### User Navigation Flow

```mermaid
graph TD
    classDef page fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef section fill:#1e293b,stroke:#8b5cf6,stroke-width:2px,color:#cbd5e1

    Login["🔐 Login Page (/login.html)"]:::page
    Auth{"Authentication Check"}

    Login -->|"Submit Credentials"| Auth
    Auth -->|"Invalid"| Login
    Auth -->|"Valid JWT"| Dash["📊 Main Dashboard (index.html)"]:::page

    Dash --> Nav["Sidebar Navigation"]:::section
    Dash --> Topbar["Topbar (Date Filters & Theme)"]:::section

    Nav -->|"Select Category"| D_Main["Dashboard Summary"]:::page
    Nav -->|"Select Category"| Op["⚙️ Operations KPIs"]:::page
    Nav -->|"Select Category"| Sales["💰 Sales & Revenue"]:::page
    Nav -->|"Select Category"| Fin["📈 Financial Ratios"]:::page
    Nav -->|"Select Category"| HR["👥 HR & Employees"]:::page
    Nav -->|"Select Category"| Comp["⚖️ Service vs Parts"]:::page
    Nav -->|"Select Category"| Branch["🏢 Branch Breakdown"]:::page
    Nav -->|"Select Category"| Acc["🏦 General Ledger"]:::page

    Topbar -.->|"Applies Globally to Active View"| D_Main
    Topbar -.->|"Applies Globally to Active View"| Op
    Topbar -.->|"Applies Globally to Active View"| Sales
    Topbar -.->|"Applies Globally to Active View"| Fin
```

## KPI Coverage (40+ KPIs)

| Category | KPIs |
|----------|------|
| **Dashboard** | Total Revenue, Gross Profit, Jobs Created, Employees, Open Jobs, Appointments, Completion Rate, Cancellation Rate + Revenue Trend Chart + Customer Type Donut |
| **Operations** | Appointment Requests, Proposals Created/Outstanding, Jobs Created/Scheduled/Completed/Worked/Open, Completion Rate, Booking Time Completion, Jobs per Tech, Cancellation Rate |
| **Sales** | Total/Service/Parts Revenue, MTD Revenue, Last Month Revenue, Expense, Cancellation Rate, Avg Quote Value, Revenue per Tech, YoY Growth + Monthly Trend Chart |
| **Financial** | Total Revenue, MTD, Last Month, COGS, Gross/Net Profit & Margins, Cash Balance, AR, AP, Revenue per Employee, Quick Ratio, Labor Cost %, Avg Job Value, YoY Growth |
| **Team/HR** | Total Employees, Service/Parts breakdown, Employee Count by Role (chart), Branch breakdown (table) |

## Time Period Filters

All KPIs support: **Today, This Week, This Month, This Year, YTD, This Quarter, Last Month, Last Year, Last Year Quarter, Last Year YTD**

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/kpi/dashboard?period=` | Combined overview |
| `GET /api/kpi/operations?period=` | Operations KPIs |
| `GET /api/kpi/sales?period=` | Sales & Revenue KPIs |
| `GET /api/kpi/financial?period=` | Financial Ratios |
| `GET /api/kpi/hr` | Team/HR metrics |
| `GET /api/kpi/revenue-trend?period=` | Monthly revenue trend |
| `GET /api/kpi/customer-type?period=` | Revenue by customer type |

## Verification Results

| Test | Result |
|------|--------|
| Server starts | ✅ Runs on port 3000 |
| Health endpoint | ✅ Returns `{"status":"ok"}` |
| HTML serves | ✅ Full dashboard HTML returned |
| CSS/JS static files | ✅ Served correctly |
| DB connections | ⚠️ Times out from dev machine (expected — server `12.168.2.10` is on LAN) |

## How to Run

```bash
cd d:\SVC\KPI
npm start
# Open http://localhost:3000 in your browser
```

> [!NOTE]
> The dashboard must be run from a machine on the same network as the database server `12.168.2.10` for data to load. The UI will show "Disconnected" and cards will stay in loading state if the DB is unreachable.
