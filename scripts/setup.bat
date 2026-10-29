@echo off
REM ============================================================================
REM DistriCommerce - One Platform. Three Regions. Distributed Intelligence.
REM Academic Mini-Project: JSPM's Rajarshi Shahu College of Engineering, Pune
REM Department of Information Technology | Faculty Guide: Dr. Pallavi Tekade
REM Team: Riya Pardhi, Pooja Jagtap, Aditi Gite, Shanitej Patil
REM ============================================================================

title DistriCommerce Setup
cls

echo ============================================================================
echo                      DISTRICOMMERCE SETUP WIZARD
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

REM 2. Check Python runtime
echo [1/4] Checking Python 3.10+ runtime...
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
%PYTHON_CMD% --version

REM 3. Check Node.js runtime
echo.
echo [2/4] Checking Node.js runtime...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%~dp0..\tools\node-v20.18.0-win-x64\node.exe" (
        set "PATH=%~dp0..\tools\node-v20.18.0-win-x64;%PATH%"
    ) else (
        echo [ERROR] Node.js was not found!
        pause
        exit /b 1
    )
)
node --version

REM 4. Install backend dependencies & initialize databases
echo.
echo [3/4] Installing Python Backend dependencies & initializing databases...
cd /d "%~dp0..\backend"
%PYTHON_CMD% -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Pip encountered an issue. Continuing with existing dependencies...
)

echo Initializing database schemas & seeding multi-city demonstration records...
%PYTHON_CMD% seed_data.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database initialization failed.
    pause
    exit /b %ERRORLEVEL%
)

REM 5. Install frontend dependencies & compile production build
echo.
echo [4/4] Installing Frontend NPM dependencies and building static bundle...
cd /d "%~dp0..\frontend"
call npm install --legacy-peer-deps
call npm run build

echo.
echo ============================================================================
echo [SETUP COMPLETE] All components, databases, and dependencies are ready!
echo Run 'scripts\start.bat' to launch DistriCommerce.
echo ============================================================================
echo.
pause
