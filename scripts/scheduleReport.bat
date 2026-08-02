@echo off
echo ===================================================
echo   Scheduling Indian IPO Tracker Daily Report Task  
echo ===================================================
echo This script will schedule the IPO daily report script to run every day at 6:00 PM (IST).
echo It requires administrator privileges to schedule tasks on some systems.
echo.

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
cd /d "%PROJECT_DIR%"

:: Create task
schtasks /create /tn "Indian_IPO_Tracker_Daily_Report" /tr "cmd.exe /c node \"%PROJECT_DIR%\scripts\sendEmailAlerts.cjs\"" /sc daily /st 04:00 /f

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Scheduled task registered successfully!
    echo The report and email alerts will run daily at 4:00 AM IST.
    echo Output report: reports/IPO_Daily_Report.md
    echo JSON database: src/data/ipoMarketData.json
    echo Configured email alerts will be sent out immediately after compile.
) else (
    echo.
    echo [ERROR] Failed to register the scheduled task. 
    echo Please run this batch script as Administrator.
)
pause
