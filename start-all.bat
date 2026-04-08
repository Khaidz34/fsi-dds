@echo off
echo.
echo ========================================
echo FSI-DDS Full Development Setup
echo ========================================
echo.
echo Starting backend server on port 10000...
echo.

REM Start backend in a new window
start "FSI-DDS Backend" cmd /k "cd backend && npm run dev"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak

echo.
echo Starting frontend dev server on port 5173...
echo.

REM Start frontend in a new window
start "FSI-DDS Frontend" cmd /k "npm run dev"

REM Wait 2 seconds for frontend to start
timeout /t 2 /nobreak

echo.
echo ========================================
echo Creating test account...
echo ========================================
echo.

REM Create test account
node create-test-account.js

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Frontend: http://localhost:5173/
echo Backend:  http://localhost:10000/
echo.
echo Login with:
echo   Username: testuser
echo   Password: Test@123456
echo.
pause
