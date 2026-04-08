@echo off
echo.
echo ========================================
echo Creating Test Account
echo ========================================
echo.
echo Make sure the dev server is running first!
echo (Run dev.bat in another terminal)
echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak
echo.
node create-test-account.js
echo.
pause
