@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo No se ha encontrado Python en este equipo.
  echo Instala Python 3 y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
start "" http://127.0.0.1:8765
python server.py
pause
