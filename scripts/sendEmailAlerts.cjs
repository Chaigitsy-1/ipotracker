const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

async function main() {
    console.log('--- Triggering Daily IPO Report Generation & Email Alerts ---');

    // 1. Run the report generator first to make sure we have the latest stock prices
    try {
        console.log('Executing generateDailyReport.cjs...');
        execSync(`node "${path.join(baseDir, 'scripts', 'generateDailyReport.cjs')}"`, { stdio: 'inherit' });
        console.log('Daily report compiled successfully.');
    } catch (err) {
        console.error('Failed to generate daily report:', err.message);
        process.exit(1);
    }

    // 2. Load SMTP configuration from Environment Variables or config file
    let config = null;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        config = {
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
    } else if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.auth.user.includes('YOUR_GMAIL_ADDRESS')) {
                console.log(`[ABORT] SMTP credentials have not been configured in ${configPath}. Please update the file.`);
                return;
            }
        } catch (e) {
            console.error('Failed to parse smtpConfig.json:', e.message);
            process.exit(1);
        }
    } else {
        const templateConfig = {
            smtpHost: "smtp.gmail.com",
            smtpPort: 465,
            secure: true,
            auth: {
                user: "YOUR_GMAIL_ADDRESS@gmail.com",
                pass: "YOUR_GMAIL_APP_PASSWORD"
            },
            emailFrom: "\"Indian IPO Screener\" <YOUR_GMAIL_ADDRESS@gmail.com>",
            emailTo: "RECIPIENT_EMAIL@gmail.com"
        };
        fs.writeFileSync(configPath, JSON.stringify(templateConfig, null, 2));
        console.log(`\n[WARNING] SMTP configuration file not found.`);
        console.log(`Created a template config file at: ${configPath}`);
        console.log(`Please open this file, fill in your credentials, or define environment variables, and run the script again.`);
        return;
    }

    // 3. Read generated report
    if (!fs.existsSync(reportPath)) {
        console.error(`Report file not found at ${reportPath}! Cannot email.`);
        process.exit(1);
    }

    const mdContent = fs.readFileSync(reportPath, 'utf8');
    const htmlBody = mdToHtml(mdContent);

    // 4. Send email
    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.secure,
        auth: {
            user: config.auth.user,
            pass: config.auth.pass
        }
    });

    const localDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    const mailOptions = {
        from: config.emailFrom,
        to: config.emailTo,
        subject: `🚨 IPO Screener Alert Report - ${localDate}`,
        html: htmlBody
    };

    try {
        console.log(`Sending email alert to ${config.emailTo}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully! MessageId:', info.messageId);
        console.log('--- Email Process Completed ---');
    } catch (emailErr) {
        console.error('Failed to send email:', emailErr.message);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal error in email sender:', err);
    process.exit(1);
});
