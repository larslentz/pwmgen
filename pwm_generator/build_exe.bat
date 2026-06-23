@echo off
echo ============================================
echo  Audio PWM Generator - EXE Builder
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install from https://python.org
    pause & exit /b 1
)

REM Install dependencies
echo Installing dependencies...
pip install sounddevice numpy pyinstaller

echo.
echo Building executable...
pyinstaller --onefile --noconsole --name "AudioPWMGenerator" main.py

echo.
if exist dist\AudioPWMGenerator.exe (
    echo SUCCESS! EXE created at:
    echo   %~dp0dist\AudioPWMGenerator.exe
) else (
    echo Build may have failed - check output above.
)
echo.
pause
