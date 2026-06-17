@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Python virtual environment not found at .venv\Scripts\python.exe
    echo Create or restore the .venv folder, then try again.
    pause
    exit /b 1
)

echo Starting frontend at http://localhost:8000/index.html
echo Keep this window open while using the app.
start "" "http://localhost:8000/index.html"
".venv\Scripts\python.exe" -m http.server 8000
pause
