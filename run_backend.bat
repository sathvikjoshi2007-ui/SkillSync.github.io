@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Python virtual environment not found at .venv\Scripts\python.exe
    echo Create or restore the .venv folder, then try again.
    pause
    exit /b 1
)

".venv\Scripts\python.exe" main.py
pause
