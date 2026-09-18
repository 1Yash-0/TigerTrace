@echo off
echo ==============================================
echo  Pench AI - Starting Backend (FastAPI)
echo ==============================================
cd /d %~dp0
pip install -r requirements.txt --quiet
echo.
echo Backend running at http://localhost:8000
echo API Docs at      http://localhost:8000/docs
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
