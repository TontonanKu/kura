@echo off
title Kura Card Online Server
echo ===================================================
echo   🎮 Menjalankan Kura Card Server & Cloudflare...
echo ===================================================
echo.
start /b node server.js
timeout /t 2 >nul
cloudflared.exe tunnel --url http://localhost:3000
pause
