# Email Configuration Guide

Hướng dẫn cấu hình email service cho chức năng forgot password.

## Cấu hình trong file `.env`

### Option 1: SMTP Configuration (Khuyến nghị)

Thêm các biến sau vào file `.env`:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@sims.ai

# Frontend URL (cho reset password link)
FRONTEND_URL=http://localhost:3000
```

### Option 2: Gmail Configuration (Đơn giản hơn)

Nếu bạn sử dụng Gmail, có thể dùng cách này:

```env
# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@sims.ai

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Hướng dẫn cho Gmail

1. **Bật 2-Step Verification:**
   - Vào [Google Account Security](https://myaccount.google.com/security)
   - Bật 2-Step Verification

2. **Tạo App Password:**
   - Vào [App Passwords](https://myaccount.google.com/apppasswords)
   - Chọn "Mail" và "Other (Custom name)"
   - Nhập tên: "SIMS Backend"
   - Copy App Password (16 ký tự, không có khoảng trắng)

3. **Sử dụng App Password:**
   - Dùng App Password này trong `.env` (không dùng password thường)

## Các Email Provider khác

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

## Development Mode

Nếu không cấu hình email service, hệ thống sẽ chạy ở **development mode**:
- Email sẽ được log ra console thay vì gửi thực sự
- Reset link sẽ được trả về trong API response (chỉ trong development)

## Kiểm tra cấu hình

Khi server khởi động, bạn sẽ thấy:
- ✅ `Email service configured successfully` - Cấu hình đúng
- ⚠️ `Email service not configured. Running in development mode.` - Chưa cấu hình, dùng development mode
- ❌ `Email service configuration error:` - Cấu hình sai, kiểm tra lại

## Testing

1. **Test forgot password:**
   ```bash
   POST /auth/forgot-password
   {
     "email": "user@example.com"
   }
   ```

2. **Kiểm tra email:**
   - Trong production: Kiểm tra inbox của user
   - Trong development: Xem console log để lấy reset link

3. **Reset password:**
   ```bash
   POST /auth/reset-password
   {
     "token": "token-from-email",
     "password": "newPassword123"
   }
   ```

## Troubleshooting

### Lỗi "Email service not configured"
- Kiểm tra file `.env` có đầy đủ thông tin SMTP/Gmail không
- Đảm bảo các biến môi trường được load đúng

### Lỗi "Failed to send password reset email"
- Kiểm tra SMTP credentials đúng chưa
- Với Gmail: Đảm bảo đã bật 2-Step Verification và dùng App Password
- Kiểm tra firewall/network có chặn port SMTP không
- Thử test với email provider khác

### Email không đến inbox
- Kiểm tra spam/junk folder
- Kiểm tra `EMAIL_FROM` có hợp lệ không
- Kiểm tra SMTP server có cho phép gửi từ domain này không
