@echo off
REM ─────────────────────────────────────────────────────────────
REM  TigerTrace free demo: local backend + public Cloudflare tunnel.
REM  1) Starts the FastAPI backend (real models, localhost:8000)
REM  2) Opens a free trycloudflare.com tunnel and prints its URL
REM  Copy the printed https://*.trycloudflare.com URL into the Vercel
REM  env var NEXT_PUBLIC_API_URL and redeploy the frontend.
REM ─────────────────────────────────────────────────────────────
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [!] .venv not found. Create it first:
    echo     py -3.12 -m venv .venv
    echo     .venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

if not exist "tools\cloudflared.exe" (
    echo [!] Downloading cloudflared...
    mkdir tools 2>nul
    curl -sL -o tools\cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
)

echo [1/2] Starting TigerTrace backend on http://localhost:8000 ...
start "TigerTrace backend" cmd /c "cd /d %~dp0backend && ..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 5 /nobreak >nul
echo [2/2] Opening public Cloudflare tunnel (keep this window open)...
echo.
tools\cloudflared.exe tunnel --url http://localhost:8000
