@echo off
REM ============================================================================
REM DistriCommerce - One Platform. Three Regions. Distributed Intelligence.
REM Academic Mini-Project: JSPM's Rajarshi Shahu College of Engineering, Pune
REM Department of Information Technology | Faculty Guide: Dr. Pallavi Tekade
REM Team: Riya Pardhi, Pooja Jagtap, Aditi Gite, Shanitej Patil
REM ============================================================================

title DistriCommerce Launcher
cls

echo ============================================================================
echo                      DISTRICOMMERCE LAUNCHER
echo        One Platform. Three Regions. Distributed Intelligence.
echo ============================================================================
echo Academic Title : Order Management of a Multi-City E-Commerce Company
echo                  Using Parallel and Distributed Databases
echo Institution    : JSPM's Rajarshi Shahu College of Engineering, Tathawade, Pune
echo Guide          : Dr. Pallavi Tekade
echo Team           : Riya Pardhi, Pooja Jagtap, Aditi Gite, Shanitej Patil
echo ============================================================================
echo.

REM 1. Configure PATH with portable & installed runtimes
set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;C:\Program Files\Python312;C:\Program Files\Python312\Scripts;%~dp0..\tools\node-v20.18.0-win-x64;%~dp0..\..\tools\node-v20.18.0-win-x64;C:\Program Files\nodejs;%PATH%"

REM 2. Verify Python runtime
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    ) else (
        echo [ERROR] Python 3.10+ was not found on your system!
        echo Please ensure Python is installed and added to PATH.
        pause
        exit /b 1
    )
) else (
    set "PYTHON_CMD=python"
)

REM 3. Verify Node runtime
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%~dp0..\tools\node-v20.18.0-win-x64\node.exe" (
        set "NODE_DIR=%~dp0..\tools\node-v20.18.0-win-x64"
        set "PATH=%~dp0..\tools\node-v20.18.0-win-x64;%PATH%"
    ) else (
        echo [ERROR] Node.js runtime was not found!
        pause
        exit /b 1
    )
)

echo [OK] Python runtime detected.
echo [OK] Node.js runtime detected.
echo.

REM 4. Start Flask Backend REST API Server
echo [1/2] Starting Flask Backend Server on port 5000...
start "DistriCommerce - Flask REST API (Port 5000)" cmd /k "title DistriCommerce Backend && cd /d %~dp0..\backend && %PYTHON_CMD% app.py"

REM Give backend 2 seconds to initialize databases & endpoints
timeout /t 2 /nobreak > nul

REM 5. Start Vite React Frontend Development Server
echo [2/2] Starting Vite Frontend Server on port 5173...
start "DistriCommerce - Vite React UI (Port 5173)" cmd /k "title DistriCommerce Frontend && cd /d %~dp0..\frontend && npm run dev"

REM Give frontend 3 seconds to spin up dev server
timeout /t 3 /nobreak > nul

REM 6. Open Web Browser
echo [BROWSER] Opening DistriCommerce in default browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ============================================================================
echo [ACTIVE] DistriCommerce is running successfully!
echo ============================================================================
echo - Frontend Application  : http://localhost:5173
echo - Backend REST API Root : http://localhost:5000
echo - System Health Check   : http://localhost:5000/api/health
echo - Central Product Sync  : http://localhost:5000/api/products
echo - Regional Shards       : Pune Node, Delhi Node, Chennai Node
echo.
echo Both server windows have been launched in the background.
echo To stop the servers, simply close their respective terminal windows.
echo ============================================================================
echo.
pause
