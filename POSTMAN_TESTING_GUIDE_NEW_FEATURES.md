# Hướng Dẫn Test Các Chức Năng Mới Trên Postman

## Mục Lục
1. [Chuẩn Bị](#chuẩn-bị)
2. [Search & Filter Warehouse](#1-search--filter-warehouse)
3. [Update Warehouse Status](#2-update-warehouse-status)
4. [View Rack Utilization](#3-view-rack-utilization)
5. [Update Rack Status](#4-update-rack-status)
6. [View Stock-in History](#5-view-stock-in-history)
7. [View Stock-out History](#6-view-stock-out-history)

---

## Chuẩn Bị

### 1. Đăng nhập để lấy JWT Token

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "manager@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "user_id",
      "name": "Manager Name",
      "email": "manager@example.com",
      "role": "manager"
    }
  }
}
```

**Lưu ý:** 
- Copy token từ response để sử dụng trong các request sau
- Với mỗi chức năng, cần role phù hợp:
  - **Manager**: Có thể test tất cả chức năng
  - **Staff/Admin**: Có thể test Search Warehouse, View Rack Utilization, View History
  - **Customer**: Chỉ có thể xem history của chính mình

### 2. Thiết Lập Postman Environment

Tạo các biến trong Postman Environment:
- `base_url`: `http://localhost:3001` (hoặc URL server của bạn)
- `token`: Token JWT từ bước đăng nhập
- `warehouse_id`: ID warehouse để test (sẽ lấy từ response)
- `shelf_id`: ID shelf để test (sẽ lấy từ response)

### 3. Thiết Lập Authorization Header

Trong mỗi request, thêm Header:
```
Authorization: Bearer {{token}}
```

---

## 1. Search & Filter Warehouse

### Endpoint
```
GET /api/warehouses
```

### Authorization
- **Roles:** Manager, Staff, Admin
- **Header:** `Authorization: Bearer {token}`

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `search` | string | No | Tìm theo tên hoặc địa chỉ warehouse | `search=Hanoi` |
| `status` | string | No | Lọc theo status: `ACTIVE` hoặc `INACTIVE` | `status=ACTIVE` |
| `page` | number | No | Số trang (mặc định: 1) | `page=1` |
| `limit` | number | No | Số lượng mỗi trang (mặc định: 10, tối đa: 100) | `limit=20` |

### Test Cases

#### Test Case 1: Lấy tất cả warehouses (không filter)
**Request:**
```
GET {{base_url}}/api/warehouses
```

**Expected Response (200 OK):**
```json
{
  "message": "Warehouses retrieved successfully",
  "data": {
    "warehouses": [
      {
        "warehouse_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Warehouse A",
        "address": "123 Main Street, Hanoi",
        "length": 100,
        "width": 50,
        "area": 5000,
        "description": "Main warehouse",
        "status": "ACTIVE",
        "created_by": "65a1b2c3d4e5f6g7h8i9j0k2",
        "created_at": "2024-01-15T10:00:00.000Z",
        "updated_at": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### Test Case 2: Search theo tên
**Request:**
```
GET {{base_url}}/api/warehouses?search=Hanoi
```

#### Test Case 3: Filter theo status
**Request:**
```
GET {{base_url}}/api/warehouses?status=ACTIVE
```

#### Test Case 4: Kết hợp search và filter
**Request:**
```
GET {{base_url}}/api/warehouses?search=Main&status=ACTIVE&page=1&limit=20
```

#### Test Case 5: Phân trang
**Request:**
```
GET {{base_url}}/api/warehouses?page=2&limit=5
```

---

## 2. Update Warehouse Status

### Endpoint
```
PATCH /api/warehouses/:id/status
```

### Authorization
- **Roles:** Manager only
- **Header:** `Authorization: Bearer {token}`

### Path Parameters
- `id`: Warehouse ID

### Request Body
```json
{
  "status": "ACTIVE" | "INACTIVE"
}
```

### Test Cases

#### Test Case 1: Chuyển warehouse sang INACTIVE
**Request:**
```
PATCH {{base_url}}/api/warehouses/{{warehouse_id}}/status
```

**Body:**
```json
{
  "status": "INACTIVE"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Warehouse status updated successfully",
  "data": {
    "warehouse_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "Warehouse A",
    "address": "123 Main Street, Hanoi",
    "length": 100,
    "width": 50,
    "area": 5000,
    "description": "Main warehouse",
    "status": "INACTIVE",
    "created_by": "65a1b2c3d4e5f6g7h8i9j0k2",
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Test Case 2: Chuyển warehouse sang ACTIVE
**Request:**
```
PATCH {{base_url}}/api/warehouses/{{warehouse_id}}/status
```

**Body:**
```json
{
  "status": "ACTIVE"
}
```

#### Test Case 3: Invalid status (Error)
**Request:**
```
PATCH {{base_url}}/api/warehouses/{{warehouse_id}}/status
```

**Body:**
```json
{
  "status": "INVALID"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "message": "Status is required and must be either ACTIVE or INACTIVE"
}
```

#### Test Case 4: Warehouse not found (Error)
**Request:**
```
PATCH {{base_url}}/api/warehouses/invalid_id/status
```

**Expected Response (400 Bad Request):**
```json
{
  "message": "Invalid warehouse ID"
}
```

---

## 3. View Rack Utilization

### Endpoint
```
GET /api/shelves/:id/utilization
```

### Authorization
- **Roles:** Manager, Staff, Admin
- **Header:** `Authorization: Bearer {token}`

### Path Parameters
- `id`: Shelf ID

### Test Cases

#### Test Case 1: Xem utilization của một shelf
**Request:**
```
GET {{base_url}}/api/shelves/{{shelf_id}}/utilization
```

**Expected Response (200 OK):**
```json
{
  "message": "Rack utilization retrieved successfully",
  "data": {
    "shelf_id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "shelf_code": "WH-A-001",
    "warehouse_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "max_capacity": 1000,
    "current_utilization": 350,
    "utilization_percentage": 35.0,
    "status": "RENTED",
    "items_count": 5
  }
}
```

**Giải thích:**
- `max_capacity`: Tổng dung lượng tối đa của shelf
- `current_utilization`: Tổng số lượng items hiện tại (từ StoredItem)
- `utilization_percentage`: Phần trăm sử dụng (current_utilization / max_capacity * 100)
- `items_count`: Số lượng loại items khác nhau trong shelf

#### Test Case 2: Shelf không có items (utilization = 0)
**Request:**
```
GET {{base_url}}/api/shelves/{{shelf_id}}/utilization
```

**Expected Response:**
```json
{
  "data": {
    "current_utilization": 0,
    "utilization_percentage": 0,
    "items_count": 0
  }
}
```

#### Test Case 3: Shelf not found (Error)
**Request:**
```
GET {{base_url}}/api/shelves/invalid_id/utilization
```

**Expected Response (400 Bad Request):**
```json
{
  "message": "Invalid shelf ID"
}
```

---

## 4. Update Rack Status

### Endpoint
```
PATCH /api/shelves/:id/status
```

### Authorization
- **Roles:** Manager only
- **Header:** `Authorization: Bearer {token}`

### Path Parameters
- `id`: Shelf ID

### Request Body
```json
{
  "status": "AVAILABLE" | "RENTED" | "MAINTENANCE"
}
```

### Test Cases

#### Test Case 1: Chuyển shelf sang MAINTENANCE
**Request:**
```
PATCH {{base_url}}/api/shelves/{{shelf_id}}/status
```

**Body:**
```json
{
  "status": "MAINTENANCE"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Rack status updated successfully",
  "data": {
    "shelf_id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "shelf_code": "WH-A-001",
    "tier_count": 5,
    "width": 2,
    "depth": 1,
    "max_capacity": 1000,
    "status": "MAINTENANCE",
    "created_at": "2024-01-15T10:00:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z"
  }
}
```

#### Test Case 2: Chuyển shelf sang AVAILABLE
**Request:**
```
PATCH {{base_url}}/api/shelves/{{shelf_id}}/status
```

**Body:**
```json
{
  "status": "AVAILABLE"
}
```

#### Test Case 3: Chuyển shelf sang RENTED
**Request:**
```
PATCH {{base_url}}/api/shelves/{{shelf_id}}/status
```

**Body:**
```json
{
  "status": "RENTED"
}
```

#### Test Case 4: Invalid status (Error)
**Request:**
```
PATCH {{base_url}}/api/shelves/{{shelf_id}}/status
```

**Body:**
```json
{
  "status": "INVALID"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "message": "Status is required and must be AVAILABLE, RENTED, or MAINTENANCE"
}
```

---

## 5. View Stock-in History

### Endpoint
```
GET /api/stock-history/inbound
```

### Authorization
- **Roles:** Manager, Staff, Admin, Customer (chỉ xem của mình)
- **Header:** `Authorization: Bearer {token}`

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `contractId` | string | No | Lọc theo contract ID | `contractId=65a1b2c3...` |
| `customerId` | string | No | Lọc theo customer ID (Manager/Staff/Admin only) | `customerId=65a1b2c3...` |
| `status` | string | No | Lọc theo status: `PENDING`, `APPROVED`, `DONE_BY_STAFF`, `COMPLETED`, `REJECTED` | `status=COMPLETED` |
| `startDate` | string | No | Ngày bắt đầu (ISO format) | `startDate=2024-01-01` |
| `endDate` | string | No | Ngày kết thúc (ISO format) | `endDate=2024-12-31` |
| `page` | number | No | Số trang (mặc định: 1) | `page=1` |
| `limit` | number | No | Số lượng mỗi trang (mặc định: 10, tối đa: 100) | `limit=20` |

### Test Cases

#### Test Case 1: Lấy tất cả stock-in history
**Request:**
```
GET {{base_url}}/api/stock-history/inbound
```

**Expected Response (200 OK):**
```json
{
  "message": "Stock-in history retrieved successfully",
  "data": {
    "history": [
      {
        "request_id": "65a1b2c3d4e5f6g7h8i9j0k4",
        "contract_id": "65a1b2c3d4e5f6g7h8i9j0k5",
        "customer_id": "65a1b2c3d4e5f6g7h8i9j0k6",
        "customer_name": "John Doe",
        "request_type": "IN",
        "status": "COMPLETED",
        "items": [
          {
            "request_detail_id": "65a1b2c3d4e5f6g7h8i9j0k7",
            "shelf_id": "65a1b2c3d4e5f6g7h8i9j0k3",
            "shelf_code": "WH-A-001",
            "item_name": "Product A",
            "quantity_requested": 100,
            "quantity_actual": 95,
            "unit": "pcs"
          }
        ],
        "approved_by": "Manager Name",
        "approved_at": "2024-01-15T10:00:00.000Z",
        "customer_confirmed_at": "2024-01-15T12:00:00.000Z",
        "created_at": "2024-01-15T09:00:00.000Z",
        "updated_at": "2024-01-15T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### Test Case 2: Filter theo contract
**Request:**
```
GET {{base_url}}/api/stock-history/inbound?contractId={{contract_id}}
```

#### Test Case 3: Filter theo status
**Request:**
```
GET {{base_url}}/api/stock-history/inbound?status=COMPLETED
```

#### Test Case 4: Filter theo date range
**Request:**
```
GET {{base_url}}/api/stock-history/inbound?startDate=2024-01-01&endDate=2024-12-31
```

#### Test Case 5: Kết hợp nhiều filters
**Request:**
```
GET {{base_url}}/api/stock-history/inbound?status=COMPLETED&startDate=2024-01-01&page=1&limit=20
```

#### Test Case 6: Customer xem history của mình
**Lưu ý:** Khi customer đăng nhập, hệ thống tự động filter chỉ hiển thị history của customer đó, không cần truyền `customerId`.

**Request (với Customer token):**
```
GET {{base_url}}/api/stock-history/inbound
```

---

## 6. View Stock-out History

### Endpoint
```
GET /api/stock-history/outbound
```

### Authorization
- **Roles:** Manager, Staff, Admin, Customer (chỉ xem của mình)
- **Header:** `Authorization: Bearer {token}`

### Query Parameters
Tương tự như Stock-in History (xem phần 5)

### Test Cases

#### Test Case 1: Lấy tất cả stock-out history
**Request:**
```
GET {{base_url}}/api/stock-history/outbound
```

**Expected Response (200 OK):**
```json
{
  "message": "Stock-out history retrieved successfully",
  "data": {
    "history": [
      {
        "request_id": "65a1b2c3d4e5f6g7h8i9j0k8",
        "contract_id": "65a1b2c3d4e5f6g7h8i9j0k5",
        "customer_id": "65a1b2c3d4e5f6g7h8i9j0k6",
        "customer_name": "John Doe",
        "request_type": "OUT",
        "status": "COMPLETED",
        "items": [
          {
            "request_detail_id": "65a1b2c3d4e5f6g7h8i9j0k9",
            "shelf_id": "65a1b2c3d4e5f6g7h8i9j0k3",
            "shelf_code": "WH-A-001",
            "item_name": "Product A",
            "quantity_requested": 50,
            "quantity_actual": 50,
            "unit": "pcs"
          }
        ],
        "approved_by": "Manager Name",
        "approved_at": "2024-01-16T10:00:00.000Z",
        "customer_confirmed_at": "2024-01-16T12:00:00.000Z",
        "created_at": "2024-01-16T09:00:00.000Z",
        "updated_at": "2024-01-16T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2
    }
  }
}
```

#### Test Case 2-6: Tương tự như Stock-in History
Áp dụng các test cases tương tự như phần 5, chỉ thay endpoint từ `/inbound` sang `/outbound`.

---

## Checklist Test Tổng Hợp

### ✅ Test Flow Hoàn Chỉnh

1. **Login** → Lấy token
2. **Search Warehouse** → Tìm warehouse để test
3. **Update Warehouse Status** → Test chuyển ACTIVE/INACTIVE
4. **View Rack Utilization** → Xem utilization của shelf
5. **Update Rack Status** → Test chuyển AVAILABLE/RENTED/MAINTENANCE
6. **View Stock-in History** → Xem lịch sử nhập kho
7. **View Stock-out History** → Xem lịch sử xuất kho

### ⚠️ Lưu Ý Khi Test

1. **Token Expiry**: Token có thể hết hạn, cần login lại
2. **Role Permissions**: Đảm bảo user có đúng role để test từng chức năng
3. **Data Dependencies**: Một số test cần có data sẵn (warehouse, shelf, contracts, storage requests)
4. **Date Format**: Sử dụng ISO 8601 format cho dates (YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm:ss.sssZ)

### 🔧 Troubleshooting

**Lỗi 401 Unauthorized:**
- Kiểm tra token có đúng không
- Kiểm tra header Authorization có format: `Bearer {token}`

**Lỗi 403 Forbidden:**
- Kiểm tra role của user có đủ quyền không
- Manager: Tất cả chức năng
- Staff/Admin: Chỉ xem, không update
- Customer: Chỉ xem history của mình

**Lỗi 400 Bad Request:**
- Kiểm tra format của request body
- Kiểm tra các giá trị enum (status, requestType, etc.)
- Kiểm tra ObjectId có hợp lệ không

---

## Postman Collection

Bạn có thể tạo Postman Collection với các request sau:

1. **Auth**
   - POST /api/auth/login

2. **Warehouse**
   - GET /api/warehouses (với query params)
   - PATCH /api/warehouses/:id/status

3. **Shelf**
   - GET /api/shelves/:id/utilization
   - PATCH /api/shelves/:id/status

4. **Stock History**
   - GET /api/stock-history/inbound (với query params)
   - GET /api/stock-history/outbound (với query params)

**Tip:** Sử dụng Postman Variables để lưu `warehouse_id`, `shelf_id`, `contract_id` từ các response để dùng cho các request sau.
