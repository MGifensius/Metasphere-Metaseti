# Metasphere — Internal Management System

Integrated business management for PT Metaseti Digital Indonesia.
Google Sheets as database · Monochrome design · Vercel-ready.

## Setup (5 minutes)

### 1. Google Sheets Backend
1. Create sheet → [sheets.new](https://sheets.new)
2. Extensions → Apps Script → paste `google-apps-script.js`
3. Select `setupSheets` → Run → Authorize
4. Deploy → New deployment → Web app (Execute as: Me, Access: Anyone)
5. Copy URL

### 2. Deploy
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
```
Push to GitHub → Import in Vercel → Add env var → Deploy

### 3. Login
`Metaseti01` / `Metaseti$123`

## Features

| Menu | Functions |
|---|---|
| **Dashboard** | Revenue, expenses, profit summary, P&L chart, service breakdown |
| **Projects** | Add jobs (4 services + combos), track status, pricing with PPN, generate invoices |
| **Payments** | Job & Non-Job pengajuan, line items, On-Going/Done status, print vouchers |
| **Finance** | Journal (auto + manual entries), Financial Statement (Laba Rugi + Neraca), downloadable reports |

### Integration Flow
- New Project → auto Journal entry (Dr: Piutang Usaha, Cr: Pendapatan Jasa)
- New Payment → auto Journal entry (Dr: Beban, Cr: Kas)
- Finance auto-generates from all journal entries

### Project Numbering
- Single: `MDI/AI/JOB1/III/2026`
- Combo: `MDI/AI-DEV/JOB1/III/2026`

### Payment Numbering
- Job: `MDI/JOB1/VCR001/XII/2025`
- Non-Job: `MDI/NJ/P001/XII/2025`

## Structure
```
├── google-apps-script.js     ← Google Apps Script backend
├── src/app/page.js            ← Login
├── src/app/dashboard/page.js  ← Full system (4 tabs)
├── src/lib/sheets.js          ← API layer (CORS-safe GET)
└── .env.local                 ← Script URL
```

Google Sheet tabs: **Projects**, **Payments**, **Journal**

© 2026 PT Metaseti Digital Indonesia
