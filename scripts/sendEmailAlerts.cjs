const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const baseDir = path.join(__dirname, '..');
const configPath = path.join(baseDir, 'smtpConfig.json');
const reportPath = path.join(baseDir, 'reports', 'IPO_Daily_Report.md');

// Helper to convert markdown-like structures into clean HTML
function mdToHtml(md) {
    if (!md) return '';
    let html = md
        // Headers
        .replace(/^# (.*$)/gim, '<h1 style="color: #6366f1; font-family: sans-serif; border-bottom: 2px solid rgba(99, 102, 241, 0.2); padding-bottom: 8px;">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 style="color: #a855f7; font-family: sans-serif; margin-top: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 style="color: #cbd5e1; font-family: sans-serif; margin-top: 16px;">$1</h3>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        // Italics
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        // Code blocks / inline code
        .replace(/`(.*?)`/g, '<code style="background-color: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: #f43f5e; font-family: monospace;">$1</code>')
        // Horizontal Rule
        .replace(/^---$/gim, '<hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />')
        // Line breaks
        .replace(/\n/g, '<br />');

    // Bullet points (simple replacement)
    html = html.replace(/^\s*-\s*(.*$)/gim, '<li style="margin-left: 20px; color: #cbd5e1; font-family: sans-serif; line-height: 1.6;">$1</li>');
    
    return `
    <div style="background-color: #0b0c10; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-family: sans-serif; max-width: 700px; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">IPO Alert Feed</span>
      </div>
      ${html}
      <div style="margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; text-align: center; font-size: 0.8rem; color: #64748b;">
        This alert was compiled automatically by your Indian IPO Anomaly Screener task scheduler.
      </div>
    </div>
    `;
}

// Helper to send Telegram Message
function sendTelegramMessage(token, chatId, text) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${token}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`Telegram API returned status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });
}

// Helper to get issue price from range
function getIssuePrice(rangeStr) {
    if (!rangeStr) return null;
    const cleaned = rangeStr.replace(/,/g, '');
    const matches = cleaned.match(/₹?\s*(\d+)\s*$/);
    return matches ? parseFloat(matches[1]) : null;
}

async function main() {
    console.log('--- Triggering Daily IPO Report Generation & Email/Telegram Alerts ---');

    // 1. Run the report generator first to make sure we have the latest stock prices
    try {
        console.log('Executing generateDailyReport.cjs...');
        execSync(`node "${path.join(baseDir, 'scripts', 'generateDailyReport.cjs')}"`, { stdio: 'inherit' });
        console.log('Daily report compiled successfully.');
    } catch (err) {
        console.error('Failed to generate daily report:', err.message);
        process.exit(1);
    }

    // 2. Load configuration from Environment Variables or config file
    let smtpConfig = null;
    let telegramConfig = null;

    // Load from environment first (GitHub Actions)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        smtpConfig = {
            smtpHost: process.env.SMTP_HOST,
            smtpPort: parseInt(process.env.SMTP_PORT || '465'),
            secure: process.env.SMTP_SECURE !== 'false',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER,
            emailTo: process.env.EMAIL_TO || process.env.SMTP_USER
        };
        console.log('Using SMTP configuration from environment variables.');
    }

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        telegramConfig = {
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            chatId: process.env.TELEGRAM_CHAT_ID
        };
        console.log('Using Telegram configuration from environment variables.');
    }

    // Load from local config file if not fully defined in env
    if ((!smtpConfig || !telegramConfig) && fs.existsSync(configPath)) {
        try {
            const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // SMTP Config
            if (!smtpConfig && fileConfig.smtpHost && fileConfig.auth && fileConfig.auth.user && !fileConfig.auth.user.includes('YOUR_GMAIL_ADDRESS')) {
                smtpConfig = fileConfig;
            }
            
            // Telegram Config
            if (!telegramConfig && fileConfig.telegramBotToken && fileConfig.telegramChatId && !fileConfig.telegramBotToken.includes('YOUR_TELEGRAM')) {
                telegramConfig = {
                    botToken: fileConfig.telegramBotToken,
                    chatId: fileConfig.telegramChatId
                };
            }
        } catch (e) {
            console.error('Failed to parse smtpConfig.json:', e.message);
        }
    }

    // If config file doesn't exist and no variables, create template
    if (!fs.existsSync(configPath) && !smtpConfig && !telegramConfig) {
        const templateConfig = {
            smtpHost: "smtp.gmail.com",
            smtpPort: 465,
            secure: true,
            auth: {
                user: "YOUR_GMAIL_ADDRESS@gmail.com",
                pass: "YOUR_GMAIL_APP_PASSWORD"
            },
            emailFrom: "\"Indian IPO Screener\" <YOUR_GMAIL_ADDRESS@gmail.com>",
            emailTo: "RECIPIENT_EMAIL@gmail.com",
            telegramBotToken: "YOUR_TELEGRAM_BOT_TOKEN",
            telegramChatId: "YOUR_TELEGRAM_CHAT_ID"
        };
        fs.writeFileSync(configPath, JSON.stringify(templateConfig, null, 2));
        console.log(`\n[WARNING] Configuration file not found.`);
        console.log(`Created a template config file at: ${configPath}`);
        console.log(`Please fill in your SMTP credentials or Telegram Bot details in this file, or define environment variables, and run again.`);
        return;
    }

    if (!smtpConfig && !telegramConfig) {
        console.log(`[ABORT] Neither SMTP nor Telegram credentials have been configured. Please update ${configPath} or define environment variables.`);
        return;
    }

    // 3. Dispatch Email Alert if SMTP Configured
    if (smtpConfig) {
        if (!fs.existsSync(reportPath)) {
            console.error(`Report file not found at ${reportPath}! Cannot email.`);
        } else {
            const mdContent = fs.readFileSync(reportPath, 'utf8');
            const htmlBody = mdToHtml(mdContent);
            const localDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

            const transporter = nodemailer.createTransport({
                host: smtpConfig.smtpHost,
                port: smtpConfig.smtpPort,
                secure: smtpConfig.secure,
                auth: {
                    user: smtpConfig.auth.user,
                    pass: smtpConfig.auth.pass
                }
            });

            const mailOptions = {
                from: smtpConfig.emailFrom,
                to: smtpConfig.emailTo,
                subject: `🚨 IPO Screener Alert Report - ${localDate}`,
                html: htmlBody
            };

            try {
                console.log(`Sending email alert to ${smtpConfig.emailTo}...`);
                const info = await transporter.sendMail(mailOptions);
                console.log('Email sent successfully! MessageId:', info.messageId);
            } catch (emailErr) {
                console.error('Failed to send email:', emailErr.message);
            }
        }
    }

    // 4. Dispatch Telegram Alert if Telegram Configured
    if (telegramConfig) {
        let telegramText = '';
        const localDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

        try {
            const dataPath = path.join(baseDir, 'src', 'data', 'ipoMarketData.json');
            if (fs.existsSync(dataPath)) {
                const marketJson = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                const results = marketJson.data || [];
                
                // Extract Cases
                const hypeDeflations = results.filter(ipo => ipo.marketData && ipo.marketData.anomalyType === 'HYPE_DEFLATION');
                const sleeperBreakouts = results.filter(ipo => ipo.marketData && ipo.marketData.anomalyType === 'SLEEPER_BREAKOUT');
                const fiftyTwoWeekHighAlerts = results.filter(ipo => ipo.marketData && ipo.marketData.anomalyType === 'FIFTY_TWO_WEEK_HIGH');

                telegramText = `*🚨 Daily Indian IPO Screener Alerts - ${localDate}*\n\n`;
                
                telegramText += `*📉 Case 1: Hype Deflations (Top 5)*\n`;
                if (hypeDeflations.length === 0) {
                    telegramText += `_No stocks flagged_\n`;
                } else {
                    telegramText += hypeDeflations.slice(0, 5).map(s => {
                        return `- *${s.symbol}*: Price ₹${s.marketData.currentPrice} (Drawdown: ${s.marketData.drawdown}%, vs Issue: ${s.marketData.vsIssue >= 0 ? '+' : ''}${s.marketData.vsIssue}%)`;
                    }).join('\n') + '\n';
                }

                telegramText += `\n*📈 Case 2: Sleeper Breakouts (Top 5)*\n`;
                if (sleeperBreakouts.length === 0) {
                    telegramText += `_No stocks flagged_\n`;
                } else {
                    telegramText += sleeperBreakouts.slice(0, 5).map(s => {
                        return `- *${s.symbol}*: Price ₹${s.marketData.currentPrice} (Vol Spike: ${s.marketData.volumeSpike}x, 1M: ${s.marketData.change1m >= 0 ? '+' : ''}${s.marketData.change1m}%)`;
                    }).join('\n') + '\n';
                }

                telegramText += `\n*⚡ Case 3: 52W High Breakouts (Top 5)*\n`;
                if (fiftyTwoWeekHighAlerts.length === 0) {
                    telegramText += `_No stocks flagged_\n`;
                } else {
                    telegramText += fiftyTwoWeekHighAlerts.slice(0, 5).map(s => {
                        return `- *${s.symbol}*: Price ₹${s.marketData.currentPrice} (${s.marketData.pctFrom52WHigh >= 0 ? '+' : ''}${s.marketData.pctFrom52WHigh.toFixed(1)}% vs. 52W High, Vol Spike: ${s.marketData.volumeSpike}x)`;
                    }).join('\n') + '\n';
                }

                telegramText += `\n_View the full dashboard at https://Chaigitsy-1.github.io/ipotracker/_`;
                
                console.log('Sending Telegram alert summary...');
                await sendTelegramMessage(telegramConfig.botToken, telegramConfig.chatId, telegramText);
                console.log('Telegram message sent successfully!');
            } else {
                console.error('Data path not found for Telegram message compilation.');
            }
        } catch (tgErr) {
            console.error('Failed to send Telegram message:', tgErr.message);
        }
    }

    console.log('--- Alert Process Completed ---');
}

main().catch(err => {
    console.error('Fatal error in alert dispatcher:', err);
    process.exit(1);
});
