## Setup

### Backend (Node.js)

```bash
cd backend
npm install
npm start
```

- Uses Express for `GET /api/portfolio`.
- Fetches CMP from Yahoo Finance using the unofficial `yahoo-finance2` library.
- Scrapes Google Finance HTML with Puppeteer for P/E ratio and latest earnings.
- Caches CMP values in memory for 15 seconds to reduce rate-limit risk.
- Reads input holdings from `backend/data/portfolio.json` and writes the latest snapshot to `backend/data/portfolio-live.json`.
- Calculates portfolio percentage dynamically based on investment weights.

#### Importing Excel Data

To import portfolio data from Excel:

```bash
cd backend
node scripts/importExcel.js
```

This script parses `excel.xlsx` from the project root and updates `backend/data/portfolio.json` with all stocks. The script:
- Extracts stock particulars, purchase price, quantity, exchange, and sector
- Generates symbols in the format `STOCK:EXCHANGE` (e.g., `TCS:NSE`)
- Filters out summary rows and invalid entries
- Removes static portfolio percentage (calculated dynamically)

### Frontend (Next.js + TypeScript + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

- Next.js app (App Router) written in TypeScript.
- Fetches portfolio data from `http://localhost:3001/api/portfolio` using `fetch`.
- Uses `@tanstack/react-table` for the portfolio table display.
- Displays a sector summary and portfolio table with Tailwind CSS styling.
- All financial values are formatted with Indian Rupee (₹) currency symbols.
- Gain/Loss cells are color coded (green for gains, red for losses).
- Sector summary also shows color-coded Gain/Loss values.
- Uses polling every 15 seconds for live updates.
- Includes loading states and error handling with retry functionality.
- Responsive design with horizontal scroll on mobile devices.
