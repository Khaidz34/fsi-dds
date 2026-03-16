# 🍽️ FSI-DDS - Hệ thống Đặt Cơm Nội Bộ

## 📋 Tổng quan
Hệ thống đặt cơm nội bộ cho công ty, hỗ trợ đa ngôn ngữ (Việt, Anh, Nhật) với giao diện thân thiện và quản lý đơn giản.

## 🚀 Công nghệ sử dụng
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: Supabase PostgreSQL
- **Hosting**: Render.com (miễn phí)

## ✨ Tính năng chính
- 🔐 Đăng nhập/đăng ký người dùng
- 📱 Giao diện responsive (mobile-first)
- 🌐 Đa ngôn ngữ (Việt/Anh/Nhật)
- 🍽️ Quản lý menu hàng ngày
- 📝 Đặt cơm cho bản thân và đồng nghiệp
- ✏️ Chỉnh sửa đơn hàng đã đặt
- 💰 Quản lý thanh toán
- 📊 Thống kê và báo cáo
- 🎮 Mini game Fusion Slice
- 👨‍💼 Panel quản trị cho admin

## 🎯 Người dùng mặc định
- **Admin**: `admin/admin123`
- **User**: `toan/user123`, `user1/user123`, `user2/user123`

## 🚀 Deploy nhanh
Xem file `DEPLOY-QUICK.md` để deploy trong 7 phút!

## 📁 Cấu trúc dự án
```
├── backend/
│   ├── server.js              # Server chính (Supabase)
│   ├── test-supabase.js        # Test database connection
│   └── package.json            # Dependencies
├── src/
│   ├── components/             # React components
│   ├── hooks/                  # Custom hooks
│   ├── services/               # API services
│   └── contexts/               # React contexts
├── SUPABASE-SETUP.sql          # Database schema
├── DEPLOY-GUIDE.md             # Hướng dẫn deploy chi tiết
└── DEPLOY-QUICK.md             # Deploy nhanh 7 phút
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm hoặc yarn

### Setup Local
```bash
# Clone repository
git clone <repo-url>
cd fsi-dds

# Install dependencies
npm install
cd backend && npm install

# Setup Supabase
# 1. Tạo project tại https://supabase.com
# 2. Chạy SUPABASE-SETUP.sql trong SQL Editor
# 3. Tạo file backend/.env:
echo "SUPABASE_URL=https://xxx.supabase.co" > backend/.env
echo "SUPABASE_ANON_KEY=eyJ..." >> backend/.env

# Start development
npm run dev          # Frontend (port 5173)
cd backend && npm run dev  # Backend (port 10000)
```

## 📱 Screenshots
- Giao diện đăng nhập đơn giản
- Dashboard responsive với thống kê
- Menu đa ngôn ngữ
- Panel đặt cơm trực quan
- Quản lý thanh toán dễ dàng

## 🌟 Tính năng nổi bật
- **Zero-config deployment**: Deploy trong 7 phút
- **Hoàn toàn miễn phí**: Supabase + Render free tier
- **Database persistent**: Không mất dữ liệu khi deploy
- **Mobile-first**: Tối ưu cho điện thoại
- **Multi-language**: Hỗ trợ 3 ngôn ngữ
- **Real-time**: Cập nhật dữ liệu tức thời

## 📞 Hỗ trợ
- Đọc `DEPLOY-GUIDE.md` cho hướng dẫn chi tiết
- Check logs trong Render Dashboard
- Verify Supabase connection với `npm run test:supabase`

## 📄 License
MIT License - Sử dụng tự do cho mục đích thương mại và cá nhân.

---
**Made with ❤️ for FSI Team**