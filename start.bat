@echo off
title WhatsApp Form
color 0A

cls
echo.
echo ================================
echo   WhatsApp Form - Starting
echo ================================
echo.
echo Initializing Next.js...
echo Wait for QR code to appear in terminal output
echo Then open http://localhost:3000
echo.

cd /d "%~dp0"
npm run dev

pause

