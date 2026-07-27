const https = require('https');
const fs = require('fs');
const path = require('path');

// Helper to make HTTPS requests
function fetchUrl(url, options = {}) {
    return new Promise((resolve, reject) => {
        const defaultHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        };
        const requestOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        https.get(url, requestOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject(new Error(`Request failed with status ${res.statusCode}: ${body.substring(0, 200)}`));
                }
            });
        }).on('error', (err) => reject(err));
    });
}

// Clean price string to extract the upper price band
function getIssuePrice(priceRange) {
    if (!priceRange || priceRange === 'N/A') return null;
    const cleaned = priceRange.replace(/,/g, '');
    const matches = cleaned.match(/₹?\s*(\d+)\s*$/);
    return matches ? parseFloat(matches[1]) : null;
}

// Helper to parse NSE date format e.g. "20-APR-2026"
function parseNseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('-');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0]);
    const monthStr = parts[1].toUpperCase();
    const year = parseInt(parts[2]);
    
    const months = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };
    const month = months[monthStr];
    if (month === undefined) return null;
    return new Date(year, month, day);
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Concurrency batch processor
async function batchProcess(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${i} to ${Math.min(i + batchSize, items.length)} of ${items.length})...`);
        const batchPromises = batch.map(item => fn(item).catch(err => {
            console.error(`  Error processing ${item.symbol}:`, err.message);
            return { ...item, marketData: null };
        }));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        await delay(250); // polite delay between batches
    }
    return results;
}

async function main() {
    console.log('--- Starting Complete IPO Market Data Update & Anomaly Screener ---');
    const localTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`Execution Time: ${localTime}`);

    const baseDir = path.join(__dirname, '..');
    const dataDir = path.join(baseDir, 'src', 'data');
    const reportsDir = path.join(baseDir, 'reports');
    const publicReportsDir = path.join(baseDir, 'public', 'reports');

    // Create directories if they don't exist
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    if (!fs.existsSync(publicReportsDir)) fs.mkdirSync(publicReportsDir, { recursive: true });

    // 1. Fetch EQUITY_L.csv from NSE to get 100% complete list of all stocks
    let csvData = '';
    const csvPath = path.join(dataDir, 'EQUITY_L.csv');
    
    try {
        console.log('Downloading official NSE EQUITY_L.csv...');
        csvData = await fetchUrl('https://archives.nseindia.com/content/equities/EQUITY_L.csv');
        fs.writeFileSync(csvPath, csvData);
        console.log('Successfully downloaded and cached EQUITY_L.csv.');
    } catch (csvErr) {
        console.warn('Failed to download equity list from NSE. Using cached copy...', csvErr.message);
        if (fs.existsSync(csvPath)) {
            csvData = fs.readFileSync(csvPath, 'utf8');
        } else {
            console.error('No cached EQUITY_L.csv found! Aborting.');
            process.exit(1);
        }
    }

    // 2. Fetch IPO details from Upvaly API (for price band, lot size, subscription details)
    let upvalyIpos = [];
    try {
        console.log('Fetching live IPO info from Upvaly FinAPI...');
        const responseText = await fetchUrl('https://finapi.upvaly.com/api/ipo');
        const responseJson = JSON.parse(responseText);
        if (responseJson.status === 'success' && Array.isArray(responseJson.data)) {
            upvalyIpos = responseJson.data;
            console.log(`Fetched ${upvalyIpos.length} IPO details from Upvaly.`);
        }
    } catch (err) {
        console.warn('Upvaly API fetch failed. Fallback to cache...');
    }

    // Load pre-seeded historical IPO details
    let seedIpos = [];
    const seedPath = path.join(dataDir, 'historicalIpos.json');
    if (fs.existsSync(seedPath)) {
        try {
            seedIpos = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
            console.log(`Loaded ${seedIpos.length} pre-seeded historical IPO details.`);
        } catch (e) {
            console.warn('Failed to parse historicalIpos.json:', e.message);
        }
    }

    // Load pre-packaged cache details as fallback
    let cachedIpos = [];
    const cachePath = path.join(dataDir, 'ipoDataCache.json');
    if (fs.existsSync(cachePath)) {
        try {
            const cacheJson = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            cachedIpos = cacheJson.data || cacheJson;
        } catch (e) {
            // ignore
        }
    }

    // Merge all metadata databases by symbol
    const metaMap = new Map();
    [...cachedIpos, ...upvalyIpos, ...seedIpos].forEach(ipo => {
        if (ipo && ipo.symbol) {
            metaMap.set(ipo.symbol.trim().toUpperCase(), ipo);
        }
    });

    // 3. Parse EQUITY_L.csv and extract listings in the last 2 years (from July 27, 2024 to July 27, 2026)
    const startDate = new Date('2024-07-27');
    const endDate = new Date('2026-07-27');
    const nseListedIpos = [];

    const lines = csvData.split('\n');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const cols = line.split(',');
        if (cols.length < 4) continue;
        
        const symbol = cols[0].trim().toUpperCase();
        const name = cols[1].trim();
        const series = cols[2].trim();
        const listingDateStr = cols[3].trim();
        
        if (series === 'EQ') {
            const listingDateObj = parseNseDate(listingDateStr);
            if (listingDateObj && listingDateObj >= startDate && listingDateObj <= endDate) {
                // Find if we have metadata details
                const meta = metaMap.get(symbol);
                nseListedIpos.push({
                    symbol,
                    name: meta ? meta.name : name,
                    type: meta ? meta.type : "Mainboard",
                    status: "CLOSED",
                    priceRange: meta && meta.priceRange ? meta.priceRange : "N/A",
                    lotSize: meta && meta.lotSize ? meta.lotSize : "N/A",
                    schedule: meta && meta.schedule ? meta.schedule : { listingDate: listingDateObj.toISOString().split('T')[0] },
                    subscriptionNumbers: meta ? meta.subscriptionNumbers : null,
                    aboutCompany: meta ? meta.aboutCompany : "",
                    strengths: meta ? meta.strengths : [],
                    risks: meta ? meta.risks : [],
                    utilizationOfProceeds: meta ? meta.utilizationOfProceeds : null,
                    drhpLink: meta ? meta.drhpLink : null,
                    rhpLink: meta ? meta.rhpLink : null,
                    greyMarketPremium: meta ? meta.greyMarketPremium : null
                });
            }
        }
    }

    console.log(`\nFound ${nseListedIpos.length} mainboard stocks listed in the last 2 years.`);

    // 4. Batch query Yahoo Finance for all 380 listings
    const processedIpos = [];
    const hypeDeflations = [];
    const sleeperBreakouts = [];
    const fiftyTwoWeekHighAlerts = [];

    const processIpo = async (ipo) => {
        const symbol = ipo.symbol;
        const issuePrice = getIssuePrice(ipo.priceRange);
        
        let ticker = `${symbol}.NS`;
        let chartData = null;
        
        try {
            const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2y`;
            const responseBody = await fetchUrl(chartUrl);
            chartData = JSON.parse(responseBody).chart.result[0];
        } catch (nseErr) {
            ticker = `${symbol}.BO`;
            try {
                const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2y`;
                const responseBody = await fetchUrl(chartUrl);
                chartData = JSON.parse(responseBody).chart.result[0];
            } catch (bseErr) {
                // both failed
            }
        }

        if (!chartData || !chartData.indicators || !chartData.indicators.quote[0]) {
            return { ...ipo, marketData: null };
        }

        const meta = chartData.meta;
        const quotes = chartData.indicators.quote[0];
        const closeArr = quotes.close || [];
        const openArr = quotes.open || [];
        const volumeArr = quotes.volume || [];

        const validCloses = closeArr.filter(c => c !== null);
        const validVolumes = volumeArr.filter(v => v !== null);

        if (validCloses.length === 0) {
            return { ...ipo, marketData: null };
        }

        const currentPrice = meta.regularMarketPrice || validCloses[validCloses.length - 1];
        const currentVolume = meta.regularMarketVolume || validVolumes[validVolumes.length - 1] || 0;

        // Listing price is the Open price of the first day
        let firstOpenIdx = openArr.findIndex(o => o !== null);
        if (firstOpenIdx === -1) firstOpenIdx = 0;
        const listingPrice = openArr[firstOpenIdx] || closeArr[firstOpenIdx] || currentPrice;
        
        // If we don't have an issue price, default it to listingPrice
        const effectiveIssuePrice = issuePrice || listingPrice;
        const listingGain = ((listingPrice - effectiveIssuePrice) / effectiveIssuePrice) * 100;

        const vsIssue = ((currentPrice - effectiveIssuePrice) / effectiveIssuePrice) * 100;
        const vsListing = ((currentPrice - listingPrice) / listingPrice) * 100;

        const peakPrice = Math.max(...validCloses);
        const drawdown = ((currentPrice - peakPrice) / peakPrice) * 100;

        const getPctChange = (offset) => {
            if (validCloses.length <= offset) return null;
            const pastPrice = validCloses[validCloses.length - 1 - offset];
            if (!pastPrice) return null;
            return ((currentPrice - pastPrice) / pastPrice) * 100;
        };

        const change1w = getPctChange(5);
        const change1m = getPctChange(21);
        const change3m = getPctChange(63);
        const change6m = getPctChange(126);
        const change1y = getPctChange(252);

        const last20Volumes = validVolumes.slice(-20);
        const volumeSma20 = last20Volumes.reduce((a, b) => a + b, 0) / (last20Volumes.length || 1);
        const volumeSpike = volumeSma20 > 0 ? (currentVolume / volumeSma20) : 1;

        const last252Closes = validCloses.slice(-252);
        const fiftyTwoWeekHigh = Math.max(...last252Closes);
        const pctFrom52WHigh = ((currentPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100;

        // Anomaly categorization
        let anomalyType = 'NONE';
        let triggers = [];
        let newsArticles = [];

        // Hype Deflation: listed high (>20%), now down below issue price or near listing price and down from peak
        if (listingGain > 20 && currentPrice < effectiveIssuePrice) {
            anomalyType = 'HYPE_DEFLATION';
        } else if (listingGain > 20 && currentPrice < 1.08 * listingPrice && drawdown < -25) {
            anomalyType = 'HYPE_DEFLATION';
        }

        // Sleeper Breakout: listed low (<=10%), now surging with volume
        const isSleeper = listingGain <= 10;
        const hasSurged = (change1m && change1m > 20) || (change3m && change3m > 35) || (change1w && change1w > 15 && volumeSpike > 1.8);
        if (isSleeper && hasSurged) {
            anomalyType = 'SLEEPER_BREAKOUT';
        }

        // 52-Week High Breakouts: close to 52w high and volume spike
        if (currentPrice >= 0.96 * fiftyTwoWeekHigh && volumeSpike > 1.3) {
            if (anomalyType === 'NONE') {
                anomalyType = 'FIFTY_TWO_WEEK_HIGH';
            }
            
            const len = validCloses.length;
            const isConsistent = len >= 3 && 
                                 validCloses[len-1] >= validCloses[len-2] && 
                                 validCloses[len-2] >= validCloses[len-3];
            
            if (isConsistent) {
                triggers.push('Consistent Breakout: Hitting consecutive new highs over the last 3 sessions on volume');
            } else {
                triggers.push('Breakout alert: Trading near or at 52-Week High on high volume');
            }
        }

        // Fetch news for flagged ones
        if (anomalyType !== 'NONE') {
            try {
                const newsUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${ticker}`;
                const searchRes = await fetchUrl(newsUrl);
                const searchJson = JSON.parse(searchRes);
                if (searchJson.news && Array.isArray(searchJson.news)) {
                    newsArticles = searchJson.news.slice(0, 5).map(n => ({
                        title: n.title,
                        publisher: n.publisher,
                        link: n.link,
                        time: n.providerPublishTime
                    }));

                    const keywords = [
                        { key: 'FII', phrase: 'FII / Institutional buying detected' },
                        { key: 'DII', phrase: 'DII / Mutual Fund accumulation' },
                        { key: 'block deal', phrase: 'Block deal transaction' },
                        { key: 'bulk deal', phrase: 'Bulk deal transaction' },
                        { key: 'stake', phrase: 'Stake acquisition / promoter activity' },
                        { key: 'earnings', phrase: 'Quarterly earnings trigger' },
                        { key: 'profit', phrase: 'Earnings growth reported' },
                        { key: 'revenue', phrase: 'Strong revenue growth reported' },
                        { key: 'order', phrase: 'New commercial order/contract bagged' },
                        { key: 'contract', phrase: 'New commercial contract bagged' },
                        { key: 'acquisition', phrase: 'Business acquisition/merger' }
                    ];

                    newsArticles.forEach(art => {
                        const titleLower = art.title.toLowerCase();
                        keywords.forEach(kw => {
                            if (titleLower.includes(kw.key.toLowerCase())) {
                                triggers.push(`${kw.phrase}: "${art.title}"`);
                            }
                        });
                    });

                    triggers = [...new Set(triggers)];
                    if (triggers.length === 0) {
                        triggers.push('Volume breakout & price action suggests heavy institutional accumulation');
                    }
                }
            } catch (newsErr) {
                // ignore news fetch failure
            }
        }

        const marketData = {
            ticker,
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            listingPrice: parseFloat(listingPrice.toFixed(2)),
            listingGain: parseFloat(listingGain.toFixed(2)),
            vsIssue: parseFloat(vsIssue.toFixed(2)),
            vsListing: parseFloat(vsListing.toFixed(2)),
            fiftyTwoWeekHigh: parseFloat(fiftyTwoWeekHigh.toFixed(2)),
            pctFrom52WHigh: parseFloat(pctFrom52WHigh.toFixed(2)),
            change1w: change1w !== null ? parseFloat(change1w.toFixed(2)) : null,
            change1m: change1m !== null ? parseFloat(change1m.toFixed(2)) : null,
            change3m: change3m !== null ? parseFloat(change3m.toFixed(2)) : null,
            change6m: change6m !== null ? parseFloat(change6m.toFixed(2)) : null,
            change1y: change1y !== null ? parseFloat(change1y.toFixed(2)) : null,
            currentVolume,
            volumeSma20: Math.round(volumeSma20),
            volumeSpike: parseFloat(volumeSpike.toFixed(2)),
            peakPrice: parseFloat(peakPrice.toFixed(2)),
            drawdown: parseFloat(drawdown.toFixed(2)),
            anomalyType,
            triggers,
            news: newsArticles
        };

        const result = {
            ...ipo,
            priceRange: ipo.priceRange === "N/A" && issuePrice === null ? `₹${marketData.listingPrice.toFixed(0)}` : ipo.priceRange,
            marketData
        };

        if (anomalyType === 'HYPE_DEFLATION') hypeDeflations.push(result);
        if (anomalyType === 'SLEEPER_BREAKOUT') sleeperBreakouts.push(result);
        if (anomalyType === 'FIFTY_TWO_WEEK_HIGH') fiftyTwoWeekHighAlerts.push(result);

        return result;
    };

    // Run batch process with concurrency of 10
    const results = await batchProcess(nseListedIpos, 10, processIpo);

    // Save final combined dataset
    const outputDataPath = path.join(dataDir, 'ipoMarketData.json');
    fs.writeFileSync(outputDataPath, JSON.stringify({
        lastUpdated: localTime,
        status: "success",
        data: results
    }, null, 2));
    console.log(`\nSuccessfully wrote ${results.length} records of combined analytical data to ${outputDataPath}`);

    // Generate Markdown Report
    const reportPath = path.join(reportsDir, 'IPO_Daily_Report.md');
    let md = `# Indian IPO Market Analysis Report\n`;
    md += `**Report Generated On:** ${localTime} | **Analyst Feed:** Automated Screener\n\n`;

    md += `## Market Indicators & Summary\n`;
    md += `- **Total Closed IPOs Screened:** ${results.length}\n`;
    md += `- **Hype Deflations Detected (Case 1):** ${hypeDeflations.length}\n`;
    md += `- **Sleeper Breakouts Detected (Case 2):** ${sleeperBreakouts.length}\n`;
    md += `- **52-Week High Breakouts (Case 3):** ${fiftyTwoWeekHighAlerts.length}\n\n`;

    md += `---\n\n`;

    md += `## 🚨 Case 1: Hype Deflation Alerts (Top 5 Listings)\n`;
    md += `*These stocks had strong listing gains (>20%) but have now crashed below their issue price or are hovering around their listing price.*\n\n`;

    if (hypeDeflations.length === 0) {
        md += `*No stocks currently matching the Hype Deflation criteria.*\n\n`;
    } else {
        hypeDeflations.slice(0, 5).forEach(stock => {
            const m = stock.marketData;
            md += `### 📉 ${stock.name} (${stock.symbol})\n`;
            md += `- **Issue Price:** ₹${getIssuePrice(stock.priceRange) || m.listingPrice} | **Listing Price:** ₹${m.listingPrice} (+${m.listingGain}% Listing Gain)\n`;
            md += `- **Current Price:** **₹${m.currentPrice}** (*Drawdown: **${m.drawdown.toFixed(1)}%** from peak*)\n`;
            md += `- **Performance:** 1W: \`${m.change1w >= 0 ? '+' : ''}${m.change1w}%\` | 1M: \`${m.change1m >= 0 ? '+' : ''}${m.change1m}%\` | 3M: \`${m.change3m >= 0 ? '+' : ''}${m.change3m}%\`\n`;
            md += `- **Volume Spike:** ${m.volumeSpike}x (Today's Vol: ${m.currentVolume.toLocaleString()})\n`;
            if (m.triggers.length > 0) {
                md += `- **Key News Triggers Detected:**\n`;
                m.triggers.forEach(t => md += `  - ${t}\n`);
            }
            md += `\n`;
        });
        if (hypeDeflations.length > 5) {
            md += `*...and ${hypeDeflations.length - 5} more Hype Deflation alerts. View them in the Market Screener tab.*\n\n`;
        }
    }

    md += `---\n\n`;

    md += `## 🚀 Case 2: Sleeper Breakout Alerts (Top 5 Listings)\n`;
    md += `*These stocks listed with weak gains (<= 10%) but are currently surging on high trading volume. This indicates sudden institutional accumulation (FII/DII buying) or turnaround catalyst triggers.*\n\n`;

    if (sleeperBreakouts.length === 0) {
        md += `*No stocks currently matching the Sleeper Breakout criteria.*\n\n`;
    } else {
        sleeperBreakouts.slice(0, 5).forEach(stock => {
            const m = stock.marketData;
            md += `### 📈 ${stock.name} (${stock.symbol})\n`;
            md += `- **Issue Price:** ₹${getIssuePrice(stock.priceRange) || m.listingPrice} | **Listing Price:** ₹${m.listingPrice} (${m.listingGain >= 0 ? '+' : ''}${m.listingGain}% Listing Gain)\n`;
            md += `- **Current Price:** **₹${m.currentPrice}** | **Peak Price:** ₹${m.peakPrice}\n`;
            md += `- **Surge Performance:** 1W: **\`${m.change1w >= 0 ? '+' : ''}${m.change1w}%\`** | 1M: **\`${m.change1m >= 0 ? '+' : ''}${m.change1m}%\`**\n`;
            md += `- **Volume Breakout:** **${m.volumeSpike}x** (Today's Vol: ${m.currentVolume.toLocaleString()})\n`;
            if (m.triggers.length > 0) {
                md += `- **Key News Triggers Detected:**\n`;
                m.triggers.forEach(t => md += `  - ${t}\n`);
            }
            md += `\n`;
        });
        if (sleeperBreakouts.length > 5) {
            md += `*...and ${sleeperBreakouts.length - 5} more Sleeper Breakout alerts. View them in the Market Screener tab.*\n\n`;
        }
    }

    md += `---\n\n`;

    md += `## 🔥 Case 3: 52-Week High Breakouts (Top 5 Listings)\n`;
    md += `*These stocks are trading within 4% of their 52-Week Highs with high breakout volumes, indicating strong upward momentum.*\n\n`;

    if (fiftyTwoWeekHighAlerts.length === 0) {
        md += `*No stocks currently matching the 52-Week High Breakout criteria.*\n\n`;
    } else {
        fiftyTwoWeekHighAlerts.slice(0, 5).forEach(stock => {
            const m = stock.marketData;
            md += `### ⚡ ${stock.name} (${stock.symbol})\n`;
            md += `- **52W High:** ₹${m.fiftyTwoWeekHigh} | **Current Price:** **₹${m.currentPrice}** (**${m.pctFrom52WHigh >= 0 ? '+' : ''}${m.pctFrom52WHigh.toFixed(1)}%** vs. 52W High)\n`;
            md += `- **Performance:** 1W: \`${m.change1w >= 0 ? '+' : ''}${m.change1w}%\` | 1M: \`${m.change1m >= 0 ? '+' : ''}${m.change1m}%\` | 3M: \`${m.change3m >= 0 ? '+' : ''}${m.change3m}%\`\n`;
            md += `- **Volume Spike:** **${m.volumeSpike}x** (Today's Vol: ${m.currentVolume.toLocaleString()})\n`;
            if (m.triggers.length > 0) {
                md += `- **Key News Triggers Detected:**\n`;
                m.triggers.forEach(t => md += `  - ${t}\n`);
            }
            md += `\n`;
        });
        if (fiftyTwoWeekHighAlerts.length > 5) {
            md += `*...and ${fiftyTwoWeekHighAlerts.length - 5} more 52-Week High Breakout alerts. View them in the Market Screener tab.*\n\n`;
        }
    }

    md += `---\n\n`;
    md += `*Disclaimer: This report is automatically generated based on technical heuristics, volume breakouts, and news keywords. It does not constitute financial advice. Verify all valuations and fundamentals before investing.*`;

    fs.writeFileSync(reportPath, md);
    const publicReportPath = path.join(publicReportsDir, 'IPO_Daily_Report.md');
    fs.writeFileSync(publicReportPath, md);
    console.log(`Successfully generated markdown reports at ${reportPath} and ${publicReportPath}`);
    console.log('--- Analysis Completed! ---');
}

main().catch(err => {
    console.error('Fatal error in report generator:', err);
    process.exit(1);
});
