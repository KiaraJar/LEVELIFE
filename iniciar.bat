@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe python -m venv .venv
.venv\Scripts\python -c "import flask, waitress" 2>nul || .venv\Scripts\python -m pip install -r requirements.txt
start "" http://localhost:5173
.venv\Scripts\python run.py
