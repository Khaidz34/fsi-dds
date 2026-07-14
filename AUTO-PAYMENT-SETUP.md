# Auto Payment Setup

Tinh nang nay dung luong chuyen khoan ngan hang + webhook. User chuyen khoan dung noi dung, provider ngan hang goi webhook ve backend, backend tu tao ban ghi `payments` va tick cac don chua thanh toan.

## 1. Chay SQL Supabase

Mo Supabase SQL Editor va chay file:

```sql
AUTO-PAYMENT-SCHEMA.sql
```

File nay them `method`, `notes` cho bang `payments` neu thieu, va tao bang `auto_payment_transactions` de chan webhook retry tao trung payment.

## 2. Cau hinh bien moi truong backend

Dat cac env vars tren Render backend:

```bash
AUTO_PAYMENT_WEBHOOK_SECRET=tao-chuoi-bi-mat-dai-va-ngau-nhien
AUTO_PAYMENT_PREFIX=FSI
AUTO_PAYMENT_BANK_ID=970423
AUTO_PAYMENT_ACCOUNT_NO=00004446755
AUTO_PAYMENT_ACCOUNT_NAME=NGUYEN DAC KHAI
AUTO_PAYMENT_QR_TEMPLATE=compact2
AUTO_PAYMENT_MONTHLY_LIMIT=50
AUTO_PAYMENT_USED_OFFSET=0
SEPAY_API_TOKEN=token-api-sepay-cua-ban
SEPAY_USAGE_ACCOUNT_NO=00004446755
```

`AUTO_PAYMENT_BANK_ID=970423` la ma BIN VietQR cua TPBank. Ban cung co the dung `TPB` neu provider QR ho tro code ngan hang. Neu chua dien bank/account, frontend van hien ma chuyen khoan nhung khong hien QR.

`AUTO_PAYMENT_MONTHLY_LIMIT` dung de hien bo dem luot giao dich SePay trong man admin thanh toan. Goi Free co the dat `50`; neu nang cap goi hoac provider doi gioi han, chi can sua bien nay tren Render.

`SEPAY_API_TOKEN` dung de backend tu dong lay so giao dich da dung trong thang tu SePay API. Tao token o SePay `API Access`, sau do dat token nay tren Render backend. Token nay chi duoc dat trong backend env, khong dua vao frontend va khong commit len GitHub.

`SEPAY_USAGE_ACCOUNT_NO` la so tai khoan TPBank dung de loc bo dem giao dich. Neu bo trong, backend se dung `AUTO_PAYMENT_ACCOUNT_NO`.

`AUTO_PAYMENT_USED_OFFSET` la phuong an du phong khi chua cau hinh `SEPAY_API_TOKEN` hoac SePay API tam loi. Bien nay dung de bu so luot SePay da tinh nhung web chua ghi nhan duoc, vi du thoi gian webhook dang bi 404 hoac chua tao bang `auto_payment_transactions`. Neu SePay dang bao "Da su dung 15" ma web moi ghi nhan 8, dat `AUTO_PAYMENT_USED_OFFSET=7`. Neu muon bu rieng cho mot thang, co the dat bien theo dang `AUTO_PAYMENT_USED_OFFSET_202607=7`.

Sau khi deploy ban moi va co `SEPAY_API_TOKEN`, web se uu tien so luot lay tu SePay API de tinh "con lai trong thang". Webhook van ghi nhan ca giao dich bi bo qua (`ignored`) de lam log noi bo; bien offset chi can dung de bu cac luot cu khi chua cau hinh duoc API token.

Neu tren web hien "Chua dong bo SePay" hoac van thay `0 / 50`, Render backend dang chua lay duoc so lieu tu SePay. Kiem tra lai `SEPAY_API_TOKEN`, bam redeploy backend, roi bam `Cap nhat` trong man Thanh toan.

So tien hien tren QR khong lay tu bien moi truong. Backend tinh so tien theo cong no that cua user:

```text
so_tien_can_tra = tong_tien_cac_don_chua_tra - tong_tien_da_thanh_toan
```

Vi du user dang no 160.000d thi QR se tao `amount=160000`; user no 85.000d thi QR se tao `amount=85000`.

QR hien tren web la QR dong VietQR, khong phai QR tinh. Backend tao link theo dang:

```text
https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<SO_TIEN>&addInfo=<NOI_DUNG>
```

Voi TPBank, user quet QR nay bang app ngan hang. App se doc san so tai khoan, so tien va noi dung chuyen khoan neu app ho tro chuan VietQR day du. User van nen kiem tra lai so tien/noi dung truoc khi bam xac nhan.

## 3. Cau hinh webhook tren provider

Webhook URL:

```text
https://<backend-domain>/api/payments/auto-webhook
```

Header bat buoc:

```text
X-Auto-Payment-Secret: <AUTO_PAYMENT_WEBHOOK_SECRET>
```

Hoac:

```text
Authorization: Bearer <AUTO_PAYMENT_WEBHOOK_SECRET>
```

Voi SePay API Key, co the dung:

```text
Authorization: Apikey <AUTO_PAYMENT_WEBHOOK_SECRET>
```

Noi dung chuyen khoan do frontend sinh theo dang:

```text
FSI<userId>M<YYYYMM>
```

Vi du user id `12`, thang `2026-06`:

```text
FSI12M202606
```

Webhook co the gui nhieu dang payload. Backend se tu tim cac field pho bien nhu `amount`, `transferAmount`, `description`, `content`, `transferContent`, `transactionId`, `referenceCode`.

Payload test toi thieu:

```json
{
  "transactionId": "test-transaction-001",
  "transferType": "in",
  "amount": 40000,
  "transferContent": "FSI1M202606"
}
```

## 4. Test nhanh bang PowerShell

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "https://<backend-domain>/api/payments/auto-webhook" `
  -Headers @{ "X-Auto-Payment-Secret" = "<AUTO_PAYMENT_WEBHOOK_SECRET>" } `
  -ContentType "application/json" `
  -Body '{"transactionId":"test-transaction-001","transferType":"in","amount":40000,"transferContent":"FSI1M202606"}'
```

Ket qua thanh cong:

```json
{
  "success": true,
  "paymentCode": "FSI1M202606",
  "markedOrders": 1
}
```

## 5. Luu y van hanh

- Chay `AUTO-PAYMENT-SCHEMA.sql` truoc khi bat webhook that de tranh ghi trung khi provider retry.
- Khong dua `AUTO_PAYMENT_WEBHOOK_SECRET` vao frontend.
- Neu user chuyen sai noi dung, webhook se bo qua giao dich; admin van co the dung nut xac nhan thu cong hien co.
- Neu provider ho tro filter theo prefix, dat prefix la `FSI` de chi day cac giao dich lien quan den he thong com.
