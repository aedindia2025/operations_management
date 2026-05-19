@echo off
setlocal

set ROOT=%~dp0
set BACKEND_DIR=%ROOT%Backend
set FRONTEND_DIR=%ROOT%frontend

set BACKEND_PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe
if not exist "%BACKEND_PYTHON%" set BACKEND_PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe

if not exist "%BACKEND_PYTHON%" (
  echo Backend virtualenv not found: %BACKEND_DIR%\venv\Scripts\python.exe or %BACKEND_DIR%\.venv\Scripts\python.exe
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo Frontend package.json not found: %FRONTEND_DIR%\package.json
  pause
  exit /b 1
)

start "OTM Backend Server" cmd /k "cd /d %BACKEND_DIR% && %BACKEND_PYTHON% manage.py runserver 0.0.0.0:7000"
start "OTM Frontend Server" cmd /k "cd /d %FRONTEND_DIR% && npm.cmd run dev:server"

echo Backend starting on http://103.110.236.187:7000

echo Frontend starting on http://103.110.236.187:55173
endlocal
