# ⚡ Deploy Nhanh FSI-DDS

## 🚀 3 Bước Deploy Nhanh

### Bước 1: Supabase Database (2 phút)
1. Vào https://supabase.com → **New Project**
2. **SQL Editor** → Copy/paste `SUPABASE-SETUP.sql` → **Run**
3. **Settings** → **API** → Copy URL và anon key

### Bước 2: Render Backend (3 phút)
1. https://render.com → **New Web Service** → Connect GitHub
2. **Settings**:
   - Build: `cd backend && npm install --production`
   - Start: `cd backend && npm start`
3. **Environment**:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```

### Bước 3: Render Frontend (2 phút)
1. **New Static Site** → Same GitHub repo
2. **Settings**:
   - Build: `npm run build`
   - Publish: `dist`

## ✅ Done!
- Frontend: `https://your-app.onrender.com`
- Login: `admin/admin123`

## 🆘 Nếu lỗi
1. Check Render logs
2. Verify Supabase keys
3. Đọc `DEPLOY-GUIDE.md` chi tiết