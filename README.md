# 📈 Indian IPO Tracker & Momentum Screener

A production-ready, full-stack stock analytics suite for tracking and screening all **380+ Mainboard IPO listings** in the Indian stock market (NSE) over the last 2 years.

This application includes a high-density, interactive stock leaderboard frontend and a daily Node.js backend engine that automatically aggregates data, checks volume/price anomalies, and emails summary alert digests.

---

## 🌟 Key Features

### 1. High-Density Market Leaderboard
- **380+ Mainboard Listings**: Integrated with the official National Stock Exchange of India (NSE) database. Excludes SME listings by default (can be toggled in the filters).
- **Calculated Offset Columns**:
  - `Vs. Issue (%)`: Shows if a stock is trading near or below its IPO issue price.
  - `Vs. Listing (%)`: Shows if it is trading near or below its listing day open price.
  - `52W High (%)`: Shows the percentage proximity to its 52-Week High.
- **Dynamic Leaderboard Ranks**: Displays rank numbers (`1`, `2`, `3`...) matching your sort columns, highlighting the top 3 gold medal winners.
- **Quick Preset Selectors**: One-click sorting for Weekly Winners, Monthly Winners, 52W High Breakouts, and Near IPO Price.

### 2. Multi-Case Anomaly Screener
- **Case 1: Hype Deflation**: Identifies high-listing-gain stocks (>20%) that have crashed below issue price or listing price.
- **Case 2: Sleeper Breakouts**: Flat listing IPOs (<=10%) showing sudden institutional accumulation (20-day SMA volume spike + price surge).
- **Case 3: 52-Week High Breakouts**: Momentum plays trading within 4% of their 52-Week Highs with high trading volume. Highlights consistent breakouts gaining over 3+ consecutive sessions.

### 3. Automated Daily Email Alerts
- Powered by `nodemailer`. Reads compiled markdown reports, converts them into a styled glassmorphic HTML email template, and fires them directly to your inbox.
- Fully compatible with cloud environments (like GitHub Actions) via secure repository secrets.

---

## 🛠️ Local Installation & Setup

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### 2. Clone & Install Dependencies
```bash
# Install package dependencies
npm install
```

### 3. Run the Dashboard locally
```bash
# Run local Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Fetch Live Data & Send Email Alert
```bash
# Runs daily report engine and fires nodemailer email
node scripts/sendEmailAlerts.cjs
```
*(On first run, this creates `smtpConfig.json` in the root folder. Open it, fill in your email SMTP details/App Passwords, and rerun the command).*

---

## 🚀 100% Free Cloud Deployment (Serverless)

You can host this application completely for free without maintaining a personal server:

### 1. Frontend UI Hosting (Vercel)
1. Push your repository to **GitHub**.
2. Connect your repository to **[Vercel](https://vercel.com/)** (Hobby plan is free).
3. Vercel will deploy it instantly and redeploy automatically whenever new data commits are pushed.

### 2. Daily Cron Job & Alerts (GitHub Actions)
A preconfigured workflow is located at `.github/workflows/daily-update.yml`. It runs every day at **6:00 PM IST (12:30 PM UTC)**.

To activate, go to your GitHub repository **Settings ➔ Secrets and Variables ➔ Actions**, and add:
* `SMTP_HOST`: e.g. `smtp.gmail.com`
* `SMTP_PORT`: `465`
* `SMTP_USER`: `your_email@gmail.com`
* `SMTP_PASS`: Your 16-digit Gmail App Password
* `EMAIL_TO`: `recipient_email@gmail.com`

---

## 📂 Project Structure
* `/scripts/generateDailyReport.cjs`: Aggregates NSE EQUITY_L.csv, pulls Yahoo Finance quotes, runs anomaly checks, and outputs JSON/Markdown.
* `/scripts/sendEmailAlerts.cjs`: Nodemailer script that compiles daily data and emails HTML newsletters.
* `/scripts/scheduleReport.bat`: Batch script to schedule daily updates locally at 6:00 PM IST using Windows Task Scheduler.
* `/src/data/ipoMarketData.json`: Locally cached database read by the UI.
* `/src/App.jsx`: Main dashboard layout with sorting filters, quick ranks, and sliders.
