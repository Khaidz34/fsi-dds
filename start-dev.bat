@echo off
echo.
echo ========================================
echo   🚀 FSI-DDS Development Server
echo ========================================
echo.
echo 📋 Starting services...
echo.

REM Check if backend/.env exists
if not exist "backend\.env" (
    echo ❌ Missing backend/.env file!
    echo.
    echo 📝 Create backend/.env with:
    echo SUPABASE_URL=https://your-project.supabase.co
    echo SUPABASE_ANON_KEY=your-anon-key
    echo JWT_SECRET=your-secret-key
    echo.
    pause
    exit /b 1
)

echo ✅ Environment file found
echo.

REM Start backend and frontend concurrently
echo 🔧 Starting backend (port 10000)...
echo 🌐 Starting frontend (port 5173)...
echo.

npm run dev:full

echo.
echo 🎯 Services:
echo 🌐 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:10000
echo 💾 Database: Supabase PostgreSQL
echo.
echo 🔑 Default accounts:
echo    admin/admin123 (Administrator)
echo    toan/user123   (User)
echo.
pause