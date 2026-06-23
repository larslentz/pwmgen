@echo off
echo ============================================
echo  Audio PWM Generator - Setup & Run
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found.
    echo Download and install from https://python.org/downloads
    echo Make sure to check "Add Python to PATH" during install.
    pause & exit /b 1
)

echo Python found. Installing required packages...
pip install sounddevice numpy

echo.
echo Launching Audio PWM Generator...
python main.py
