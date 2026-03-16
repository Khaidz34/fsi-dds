# 🚀 Hướng dẫn Deploy FSI-DDS lên Render.com

## 📋 Tổng quan
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: Supabase PostgreSQL (miễn phí)
- **Hosting**: Render.com (miễn phí)

## 🎯 Bước 1: Setup Supabase Database

### 1.1 Tạo Supabase Project
1. Vào https://supabase.com
2. Đăng ký/đăng nhập
3. Click **New Project**
4. Chọn organization và nhập:
   - **Name**: fsi-dds
   - **Database Password**: [tạo password mạnh]
   - **Region**: Southeast Asia (Singapore)
5. Click **Create new project**

### 1.2 Tạo Database Schema
1. Trong Supabase Dashboard → **SQL Editor**
2. Copy toàn bộ nội dung file `SUPABASE-SETUP.sql`
3. Paste vào editor và click **Run**
4. Kiểm tra **Table Editor** để đảm bảo các bảng đã được tạo

### 1.3 Lấy API Keys
1. Vào **Settings** → **API**
2. Copy 2 keys:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJ...` (key dài)

## 🎯 Bước 2: Deploy Backend lên Render

### 2.1 Tạo Render Account
1. Vào https://render.com
2. Đăng ký với GitHub account

### 2.2 Connect GitHub Repository
1. Push code lên GitHub repository
2. Trong Render Dashboard → **New** → **Web Service**
3. Connect GitHub repository

### 2.3 Configure Backend Service
- **Name**: `fsi-dds-backend`
- **Environment**: `Node`
- **Build Command**: `cd backend && npm install --production`
- **Start Command**: `cd backend && npm start`
- **Plan**: `Free`

### 2.4 Set Environment Variables
Trong **Environment** tab, thêm:
```
NODE_ENV=production
JWT_SECRET=[auto-generated]
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
PORT=10000
```

### 2.5 Deploy
1. Click **Create Web Service**
2. Đợi build và deploy hoàn thành
3. Lấy URL backend: `https://fsi-dds-backend.onrender.com`

## 🎯 Bước 3: Deploy Frontend

### 3.1 Update API URL
Trong file `src/services/api.ts`, cập nhật:
```typescript
const API_BASE_URL = 'https://fsi-dds-backend.onrender.com';
```

### 3.2 Build Frontend
```bash
npm run build
```

### 3.3 Deploy Frontend lên Render
1. **New** → **Static Site**
2. Connect same GitHub repository
3. Configure:
   - **Name**: `fsi-dds-frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: `Free`

## 🎯 Bước 4: Test Application

### 4.1 Test Backend
- Health check: `https://fsi-dds-backend.onrender.com/health`
- Should return: `{"status":"ok","database":"connected"}`

### 4.2 Test Frontend
- Vào: `https://fsi-dds-frontend.onrender.com`
- Login với: `admin/admin123`

## 🔧 Troubleshooting

### Backend không start
1. Check logs trong Render Dashboard
2. Đảm bảo environment variables đúng
3. Test Supabase connection: `npm run test:supabase`

### Database connection failed
1. Kiểm tra Supabase project có active không
2. Verify SUPABASE_URL và SUPABASE_ANON_KEY
3. Chạy lại `SUPABASE-SETUP.sql`

### Frontend không connect được backend
1. Kiểm tra API_BASE_URL trong `src/services/api.ts`
2. Check CORS settings trong backend
3. Verify backend health endpoint

## 💰 Chi phí
- **Supabase**: Miễn phí (500MB database, 50MB file storage)
- **Render**: Miễn phí (750 hours/month, sleep after 15 min inactive)
- **Total**: $0/month

## 🚀 URLs sau khi deploy
- **Frontend**: `https://fsi-dds-frontend.onrender.com`
- **Backend**: `https://fsi-dds-backend.onrender.com`
- **Database**: Supabase Dashboard

## 📱 Default Users
- **Admin**: `admin/admin123`
- **User**: `toan/user123`, `user1/user123`, `user2/user123`