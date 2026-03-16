# Cấu hình Port cho FSI DDS

## Port mặc định

### Frontend (React + Vite)
- **Port**: 5173
- **URL**: http://localhost:5173
- **Cấu hình**: `vite.config.ts` - `server.port: 5173`

### Backend (Express.js)
- **Port**: 5000
- **URL**: http://localhost:5000
- **Cấu hình**: `backend/.env` - `PORT=5000`
- **Mặc định**: Nếu không có PORT trong .env, sẽ dùng 5000

## Cách thay đổi port

### Thay đổi Frontend Port
Sửa file `vite.config.ts`:
```typescript
server: {
  port: 5173, // Đổi thành port khác
  host: true
}
```

### Thay đổi Backend Port
Sửa file `backend/.env`:
```
PORT=5000  # Đổi thành port khác
```

## CORS Configuration

Backend đã được cấu hình để chấp nhận kết nối từ:
- `http://localhost:5173` (Frontend mặc định)
- `http://localhost:5174` (Frontend port thay thế)
- `http://localhost:5175` (Frontend port thay thế)
- Tất cả local network IPs: `192.168.x.x`, `10.x.x.x`
- Tất cả localhost ports: `http://localhost:*`

## Khởi chạy

### Chạy cả Frontend và Backend
```bash
npm run dev:full
```
Hoặc double-click: `start-local.bat`

### Chỉ chạy Frontend
```bash
npm run dev
```
Hoặc double-click: `start-frontend-only.bat`

### Chỉ chạy Backend
```bash
cd backend
npm run dev:sqlite
```
Hoặc double-click: `start-backend-only.bat`

## Kiểm tra Port

Chạy script kiểm tra port:
```bash
check-ports.bat
```

Hoặc kill port đang sử dụng:
```bash
kill-ports.bat
```

## Lưu ý

- **KHÔNG** thay đổi port trong code trực tiếp
- **LUÔN** sử dụng file .env để cấu hình
- Backend mặc định: **PORT 5000**
- Frontend mặc định: **PORT 5173**
