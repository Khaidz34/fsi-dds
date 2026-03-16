# 🗄️ Sửa vấn đề Database bị reset

## ❌ **Vấn đề:**
- Database bị tạo mới mỗi lần deploy
- Mất hết dữ liệu users, orders, payments
- Persistent disk không hoạt động đúng

## ✅ **Giải pháp:**

### **Bước 1: Kiểm tra Persistent Disk trên Render**

1. **Vào Render Dashboard:**
   - https://dashboard.render.com
   - Chọn backend service `fsi-dds-backend`

2. **Kiểm tra Settings:**
   - Click tab **"Settings"**
   - Scroll xuống **"Persistent Disks"**

3. **Nếu KHÔNG có disk:**
   - Click **"Add Disk"**
   - **Name:** `fsi-dds-data`
   - **Mount Path:** `/opt/render/project/src/data`
   - **Size:** 1 GB
   - Click **"Save Changes"**

4. **Nếu ĐÃ có disk:**
   - Kiểm tra Mount Path đúng: `/opt/render/project/src/data`
   - Kiểm tra Status: `Attached`

### **Bước 2: Redeploy Service**

1. **Deploy tab** → **Manual Deploy**
2. **Deploy Latest Commit**
3. **Xem logs** để kiểm tra:

```
🗄️  Database Configuration:
   Path: /opt/render/project/src/data/gourmetgrid.db
   NODE_ENV: production
   DATABASE_PATH env: /opt/render/project/src/data/gourmetgrid.db
📁 Database directory exists: true
🗄️  Database file exists: true
✅ Đã kết nối SQLite database
📊 Database has 6 tables
👥 Database has X existing users
```

### **Bước 3: Test Database Persistence**

1. **Tạo user mới** trên website
2. **Redeploy** service một lần nữa
3. **Kiểm tra** user vẫn còn

### **Bước 4: Backup Database (Quan trọng!)**

```bash
# Local backup
node backup-database.js

# Hoặc từ Render Shell
sqlite3 /opt/render/project/src/data/gourmetgrid.db .dump > backup.sql
```

---

## 🔍 **Troubleshooting:**

### **Nếu vẫn bị reset:**

**1. Kiểm tra logs:**
```
🗄️  Database file exists: false  ← VẤN ĐỀ!
```

**2. Kiểm tra Mount Path:**
- Render Dashboard → Settings → Persistent Disks
- Mount Path phải là: `/opt/render/project/src/data`
- KHÔNG phải: `/data` hay `/app/data`

**3. Kiểm tra Environment Variables:**
```
DATABASE_PATH=/opt/render/project/src/data/gourmetgrid.db
```

**4. Restart Service:**
- Settings → Restart Service
- Hoặc Manual Deploy

### **Nếu Persistent Disk không tạo được:**

**Nguyên nhân:** Free tier có giới hạn
**Giải pháp:**
1. **Xóa disk cũ** nếu có
2. **Tạo lại** với đúng config
3. **Hoặc chuyển sang Railway** (cũng miễn phí)

---

## 🚀 **Alternative: Chuyển sang Railway**

Nếu Render vẫn có vấn đề:

1. **Railway.app** → Connect GitHub
2. **Deploy** từ repo `fsi-dds`
3. **Environment Variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=your-secret-key
   DATABASE_PATH=/app/data/gourmetgrid.db
   PORT=3000
   ```
4. **Volume Mount:**
   - Path: `/app/data`
   - Size: 1GB

Railway thường ổn định hơn với SQLite persistence.

---

## 📊 **Kiểm tra Database:**

### **Từ Render Shell:**
```bash
# Connect to shell
sqlite3 /opt/render/project/src/data/gourmetgrid.db

# Check tables
.tables

# Check users
SELECT COUNT(*) FROM users;
SELECT username, fullname FROM users;

# Exit
.quit
```

### **Từ API (Development):**
```
GET /debug/stats
GET /debug/table/users
```

---

## 💡 **Best Practices:**

1. **Backup thường xuyên** trước khi deploy
2. **Monitor logs** sau mỗi deploy
3. **Test persistence** bằng cách tạo data → deploy → check
4. **Sử dụng environment variables** đúng cách
5. **Không hardcode paths** trong code

---

## 🆘 **Nếu vẫn không được:**

1. **Export data** từ database hiện tại
2. **Chuyển sang PostgreSQL** (Render cung cấp free)
3. **Hoặc chuyển platform** (Railway, Fly.io)

**Liên hệ Render Support:** help@render.com nếu persistent disk không hoạt động.