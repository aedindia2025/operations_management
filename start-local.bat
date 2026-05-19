@echo off
setlocal

set ROOT=%~dp0
set BACKEND_DIR=%ROOT%Backend
set FRONTEND_DIR=%ROOT%frontend

if not exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
  echo Backend virtualenv not found: %BACKEND_DIR%\.venv\Scripts\python.exe
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo Frontend package.json not found: %FRONTEND_DIR%\package.json
  pause
  exit /b 1
)

start "OTM Backend" cmd /k "cd /d %BACKEND_DIR% && .venv\Scripts\python.exe manage.py runserver 0.0.0.0:7000"
start "OTM Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm.cmd run dev:server"

echo Backend starting on http://127.0.0.1:7000

echo Frontend starting on http://localhost:5173
endlocal
