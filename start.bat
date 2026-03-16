@echo off
chcp 65001 >nul
cls
echo ========================================
echo    FSI DDS - Hệ Thống Đặt Cơm
echo ========================================
echo.

REM Kiểm tra Node.js
echo [1/4] Đang kiểm tra Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js chưa được cài đặt!
    echo Vui lòng cài đặt Node.js từ: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js đã sẵn sàng
echo.

REM Kiểm tra và kill port nếu đang sử dụng
echo [2/4] Đang kiểm tra các port...
netstat -ano | findstr :5000 >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Port 5000 đang được sử dụng
    echo Đang dừng process trên port 5000...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 1 >nul
)

netstat -ano | findstr :5173 >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Port 5173 đang được sử dụng
    echo Đang dừng process trên port 5173...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 1 >nul
)
echo ✅ Các port đã sẵn sàng
echo.

REM Cài đặt dependencies
echo [3/4] Đang cài đặt dependencies...
echo.
echo → Cài đặt Frontend dependencies...
call npm install --silent
if errorlevel 1 (
    echo ❌ Lỗi khi cài đặt frontend dependencies!
    pause
    exit /b 1
)

echo → Cài đặt Backend dependencies...
cd backend
call npm install --silent
if errorlevel 1 (
    echo ❌ Lỗi khi cài đặt backend dependencies!
    pause
    exit /b 1
)
cd ..
echo ✅ Dependencies đã được cài đặt
echo.

REM Khởi chạy ứng dụng
echo [4/4] Đang khởi chạy ứng dụng...
echo.
echo ========================================
echo    Thông tin truy cập:
echo ========================================
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:5000
echo 💾 Database: SQLite (gourmetgrid.db)
echo.
echo 🔑 Tài khoản mặc định:
echo    Username: admin
echo    Password: password
echo.
echo ⚠️  Nhấn Ctrl+C để dừng ứng dụng
echo ========================================
echo.

REM Khởi chạy cả frontend và backend
call npm run dev:full

echo.
echo ========================================
echo    Ứng dụng đã dừng!
echo ========================================
pause