@echo off
echo ===================================================
echo   Memulai Aplikasi Isi Ulang Tinta Printer
echo ===================================================

echo [1/2] Menjalankan Backend Node.js / Express Server (Port 5000)...
start "Backend Server (Port 5000)" cmd /k "cd /d %~dp0server && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] Menjalankan Frontend React App (Port 3000)...
start "Frontend React App (Port 3000)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Aplikasi akan dapat diakses di browser: http://localhost:3000
echo.
pause
