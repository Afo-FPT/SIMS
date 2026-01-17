# Hướng dẫn Test API trên Postman

## Cấu hình cơ bản

**Base URL:** `http://localhost:3001/api`

**Headers mặc định:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (cho các endpoint yêu cầu authentication)

---

## 🔐 1. AUTHENTICATION APIs

### 1.1. Đăng ký User mới (Manager/Staff)

**Endpoint:** `POST /api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "Password123",
  "role": "manager"
}
```
hoặc
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "password": "Password123",
  "role": "staff"
}
```

**Expected Response (201):**
```json
{
  "message": "User registered successfully. Please wait for admin activation",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "manager",
    "isActive": false
  }
}
```

**Lưu ý:** 
- Chỉ cho phép role `manager` hoặc `staff`
- Tài khoản mới có `isActive: false`

---

### 1.2. Đăng nhập (Admin - Tự động tạo)

**Endpoint:** `POST /api/auth/login`

**Body (JSON):**
```json
{
  "email": "admin@sims.ai",
  "password": "Admin@123"
}
```

**Expected Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "name": "System Admin",
    "email": "admin@sims.ai",
    "role": "admin",
    "isActive": true
  }
}
```

**Lưu ý:** 
- Admin account được tạo tự động khi server khởi động
- Mặc định: `admin@sims.ai` / `Admin@123`
- Có thể thay đổi qua environment variables

---

### 1.3. Đăng nhập User chưa kích hoạt (Sẽ thất bại)

**Endpoint:** `POST /api/auth/login`

**Body (JSON):**
```json
{
  "email": "john.doe@example.com",
  "password": "Password123"
}
```

**Expected Response (401):**
```json
{
  "message": "Account is not activated. Please contact admin"
}
```

---

## 👥 2. USER MANAGEMENT APIs (Chỉ Admin)

### 2.1. Lấy thông tin User hiện tại

**Endpoint:** `GET /api/users/me`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected Response (200):**
```json
{
  "_id": "...",
  "name": "System Admin",
  "email": "admin@sims.ai",
  "role": "admin",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### 2.2. Lấy danh sách tất cả Users (Manager & Staff)

**Endpoint:** `GET /api/users`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "...",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "manager",
      "isActive": false,
      "createdAt": "...",
      "updatedAt": "..."
    },
    {
      "_id": "...",
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "role": "staff",
      "isActive": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### 2.3. Lấy thông tin User theo ID

**Endpoint:** `GET /api/users/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**URL Example:** `GET /api/users/507f1f77bcf86cd799439011`

**Expected Response (200):**
```json
{
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "manager",
    "isActive": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 2.4. Kích hoạt tài khoản User

**Endpoint:** `PUT /api/users/:id/activate`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**URL Example:** `PUT /api/users/507f1f77bcf86cd799439011/activate`

**Expected Response (200):**
```json
{
  "message": "User activated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "manager",
    "isActive": true
  }
}
```

---

### 2.5. Vô hiệu hóa tài khoản User

**Endpoint:** `PUT /api/users/:id/deactivate`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**URL Example:** `PUT /api/users/507f1f77bcf86cd799439011/deactivate`

**Expected Response (200):**
```json
{
  "message": "User deactivated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "manager",
    "isActive": false
  }
}
```

---

### 2.6. Cập nhật thông tin User

**Endpoint:** `PUT /api/users/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**URL Example:** `PUT /api/users/507f1f77bcf86cd799439011`

**Body (JSON) - Có thể cập nhật name hoặc role:**
```json
{
  "name": "John Updated",
  "role": "staff"
}
```
hoặc chỉ cập nhật một field:
```json
{
  "name": "John Updated"
}
```

**Expected Response (200):**
```json
{
  "message": "User updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Updated",
    "email": "john.doe@example.com",
    "role": "staff",
    "isActive": true
  }
}
```

---

### 2.7. Xóa User

**Endpoint:** `DELETE /api/users/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**URL Example:** `DELETE /api/users/507f1f77bcf86cd799439011`

**Expected Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

**Lưu ý:** Không thể xóa Admin account

---

## 📋 3. TEST FLOW HOÀN CHỈNH

### Bước 1: Khởi động Server
```bash
cd apps/backend
npm run dev
```

**Kiểm tra console:** Admin account sẽ được tạo tự động (hoặc thông báo đã tồn tại)

---

### Bước 2: Đăng nhập Admin

**Request:**
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@sims.ai",
  "password": "Admin@123"
}
```

**Lưu token từ response** để sử dụng cho các request sau

---

### Bước 3: Đăng ký User mới (Manager)

**Request:**
```
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "name": "Manager Test",
  "email": "manager@test.com",
  "password": "Test123",
  "role": "manager"
}
```

**Lưu `_id` của user** để sử dụng cho các bước sau

---

### Bước 4: Đăng nhập User chưa kích hoạt (Sẽ thất bại)

**Request:**
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "manager@test.com",
  "password": "Test123"
}
```

**Expected:** Error 401 - "Account is not activated. Please contact admin"

---

### Bước 5: Admin kích hoạt User

**Request:**
```
PUT http://localhost:3001/api/users/{user_id}/activate
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Expected:** User `isActive` = true

---

### Bước 6: Đăng nhập User đã kích hoạt (Thành công)

**Request:**
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "manager@test.com",
  "password": "Test123"
}
```

**Expected:** Login thành công, nhận token

---

### Bước 7: Xem danh sách Users

**Request:**
```
GET http://localhost:3001/api/users
Authorization: Bearer <admin_token>
```

**Expected:** Danh sách tất cả users (manager & staff)

---

### Bước 8: Cập nhật User

**Request:**
```
PUT http://localhost:3001/api/users/{user_id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Manager Updated",
  "role": "staff"
}
```

---

### Bước 9: Vô hiệu hóa User

**Request:**
```
PUT http://localhost:3001/api/users/{user_id}/deactivate
Authorization: Bearer <admin_token>
Content-Type: application/json
```

---

### Bước 10: Xóa User (Optional)

**Request:**
```
DELETE http://localhost:3001/api/users/{user_id}
Authorization: Bearer <admin_token>
```

---

## 🔍 4. ERROR CASES CẦN TEST

### 4.1. Đăng ký với role không hợp lệ
```json
{
  "name": "Test",
  "email": "test@test.com",
  "password": "Test123",
  "role": "admin"  // ❌ Không được phép
}
```
**Expected:** Error 400 - "Invalid role. Only manager or staff roles are allowed"

---

### 4.2. Đăng ký email trùng
**Expected:** Error 400 - "Email already exists"

---

### 4.3. Truy cập API quản lý users không có token
**Expected:** Error 401 - "Unauthorized"

---

### 4.4. Manager/Staff truy cập API quản lý users
**Expected:** Error 403 - "Forbidden"

---

### 4.5. Kích hoạt Admin account
**Expected:** Error 400 - "Cannot activate admin account"

---

### 4.6. Cập nhật role không hợp lệ
```json
{
  "role": "admin"  // ❌ Không được phép
}
```
**Expected:** Error 400 - "Invalid role. Only manager or staff roles are allowed"

---

## 💡 5. TIPS CHO POSTMAN

### 5.1. Tạo Environment Variables
Tạo một Environment trong Postman với:
- `base_url`: `http://localhost:3001/api`
- `admin_token`: `<token từ login admin>`
- `user_token`: `<token từ login user>`
- `user_id`: `<id của user đang test>`

Sau đó sử dụng: `{{base_url}}/auth/login`

### 5.2. Tạo Collection
Tổ chức các requests thành Collection:
- **Authentication**
  - Register
  - Login Admin
  - Login User
- **User Management** (Admin only)
  - Get Me
  - Get All Users
  - Get User by ID
  - Activate User
  - Deactivate User
  - Update User
  - Delete User

### 5.3. Sử dụng Tests Script
Trong tab "Tests" của mỗi request, thêm script để tự động lưu token:
```javascript
// Lưu token sau khi login
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    if (jsonData.token) {
        pm.environment.set("admin_token", jsonData.token);
    }
    if (jsonData.user && jsonData.user._id) {
        pm.environment.set("user_id", jsonData.user._id);
    }
}
```

---

## ✅ 6. CHECKLIST TEST

- [ ] Admin account được tạo tự động khi server start
- [ ] Đăng ký user mới (manager) thành công
- [ ] Đăng ký user mới (staff) thành công
- [ ] Đăng ký với role admin bị từ chối
- [ ] Đăng nhập admin thành công
- [ ] Đăng nhập user chưa kích hoạt bị từ chối
- [ ] Admin kích hoạt user thành công
- [ ] User đã kích hoạt đăng nhập thành công
- [ ] Admin xem danh sách users
- [ ] Admin xem chi tiết user
- [ ] Admin cập nhật user
- [ ] Admin vô hiệu hóa user
- [ ] User vô hiệu hóa không thể đăng nhập
- [ ] Admin xóa user
- [ ] Manager/Staff không thể truy cập API quản lý users
- [ ] Không thể thao tác trên Admin account

---

## 🚀 7. QUICK START COMMANDS

```bash
# 1. Khởi động backend server
cd apps/backend
npm run dev

# 2. Trong Postman, test theo thứ tự:
#    - POST /api/auth/login (Admin)
#    - POST /api/auth/register (Tạo user mới)
#    - PUT /api/users/:id/activate (Kích hoạt user)
#    - POST /api/auth/login (User đã kích hoạt)
#    - GET /api/users (Xem danh sách)
```

---

**Lưu ý:** Đảm bảo MongoDB đang chạy và có file `.env` với `MONGO_URI` được cấu hình đúng!
