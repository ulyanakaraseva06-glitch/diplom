@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\move-hero-images.ps1"
echo.
pause
