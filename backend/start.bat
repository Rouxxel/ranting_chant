@echo off
REM Ranting Chant Backend - Development Startup Script (Windows)

echo 🚀 Ranting Chant Backend - Development Setup
echo ========================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.12+ and try again.
    pause
    exit /b 1
)

echo ✅ Python found
python --version

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Check if .env exists, if not copy from .env.example
if not exist ".env" (
    echo ⚙️  Creating .env from .env.example...
    copy .env.example .env
    echo ✅ .env created - please update with your API keys and configuration
)

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

echo.
echo 🎯 Setup complete! Choose how to run:
echo 1. Development mode (with reload)
echo 2. Production mode
echo 3. Docker mode
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo 🔄 Starting in development mode with hot reload...
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
) else if "%choice%"=="2" (
    echo 🚀 Starting in production mode...
    python main.py
) else if "%choice%"=="3" (
    echo 🐳 Starting with Docker...
    docker-compose up --build
) else (
    echo ❌ Invalid choice. Starting in development mode...
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
)

pause