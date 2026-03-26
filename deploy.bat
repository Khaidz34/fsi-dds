@echo off
echo Building frontend...
call npm run build

echo Copying to backend...
xcopy /E /I /Y dist\* backend\public\

echo Committing changes...
git add .
git commit -m "Fix: Display remainingCount instead of ordersCount for unpaid meals"

echo Pushing to GitHub...
git push

echo Done! Wait for Render to deploy.
pause
