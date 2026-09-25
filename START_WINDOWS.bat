@echo off
cd /d "%~dp0"
echo Open http://localhost:8080 in your browser.
echo Requires Python 3. Keep this window open while playing.
py -3 -m http.server 8080 --bind 127.0.0.1 --directory dist
pause
