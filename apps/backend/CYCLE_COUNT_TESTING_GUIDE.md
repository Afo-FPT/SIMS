# Cycle Count API Testing Guide

Hướng dẫn test đầy đủ chức năng Cycle Count từ đầu đến cuối, bao gồm tạo accounts cho tất cả các roles và các API cần thiết.

**Base URL**: `http://localhost:3001/api`

---

## Bước 1: Tạo Accounts cho tất cả các Roles

### 1.1. Admin Account
Admin account được tự động tạo khi server khởi động với thông tin mặc định:
- **Email**: `admin@sims.ai` (hoặc từ env `ADMIN_EMAIL`)
- **Password**: `Admin@123` (hoặc từ env `ADMIN_PASSWORD`)
- **Role**: `admin`
- **isActive**: `true` (tự động kích hoạt)

**Login Admin:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@sims.ai",
  "password": "Admin@123"
}
```

**Response:**
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

**Lưu token Admin vào biến**: `adminToken`

---

### 1.2. Tạo Manager Account

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Manager Test",
  "email": "manager@test.com",
  "password": "Manager123",
  "role": "manager"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please wait for admin activation",
  "user": {
    "_id": "manager_id_here",
    "name": "Manager Test",
    "email": "manager@test.com",
    "role": "manager",
    "isActive": false
  }
}
```

**Lưu `_id`**: `managerId`

**Admin kích hoạt Manager:**
```http
PUT /api/users/{{managerId}}/activate
Authorization: Bearer {{adminToken}}
```

**Login Manager:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "manager@test.com",
  "password": "Manager123"
}
```

**Lưu token Manager**: `managerToken`

---

### 1.3. Tạo Staff Account

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Staff Test",
  "email": "staff@test.com",
  "password": "Staff123",
  "role": "staff"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please wait for admin activation",
  "user": {
    "_id": "staff_id_here",
    "name": "Staff Test",
    "email": "staff@test.com",
    "role": "staff",
    "isActive": false
  }
}
```

**Lưu `_id`**: `staffId`

**Admin kích hoạt Staff:**
```http
PUT /api/users/{{staffId}}/activate
Authorization: Bearer {{adminToken}}
```

**Login Staff:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "staff@test.com",
  "password": "Staff123"
}
```

**Lưu token Staff**: `staffToken`

---

### 1.4. Tạo Customer Account

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Customer Test",
  "email": "customer@test.com",
  "password": "Customer123",
  "role": "customer"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please wait for admin activation",
  "user": {
    "_id": "customer_id_here",
    "name": "Customer Test",
    "email": "customer@test.com",
    "role": "customer",
    "isActive": false
  }
}
```

**Lưu `_id`**: `customerId`

**Admin kích hoạt Customer:**
```http
PUT /api/users/{{customerId}}/activate
Authorization: Bearer {{adminToken}}
```

**Login Customer:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "customer@test.com",
  "password": "Customer123"
}
```

**Lưu token Customer**: `customerToken`

---

## Bước 2: Tạo Warehouse và Shelves

### 2.1. Manager tạo Warehouse

```http
POST /api/warehouses
Authorization: Bearer {{managerToken}}
Content-Type: application/json

{
  "name": "Warehouse A",
  "address": "123 Main Street",
  "length": 100,
  "width": 50,
  "description": "Main warehouse for testing"
}
```

**Response:**
```json
{
  "message": "Warehouse created successfully",
  "data": {
    "warehouse_id": "warehouse_id_here",
    "name": "Warehouse A",
    "address": "123 Main Street",
    "length": 100,
    "width": 50,
    "area": 5000,
    "description": "Main warehouse for testing",
    "status": "ACTIVE",
    "created_by": "...",
    "created_at": "2026-01-23T...",
    "updated_at": "2026-01-23T..."
  }
}
```

**Lưu `warehouse_id`**: `69777ad1eb5a4c97bab4209b`

---

### 2.2. Manager tạo Shelves cho Warehouse

```http
POST /api/warehouses/{{warehouseId}}/shelves
Authorization: Bearer {{managerToken}}
Content-Type: application/json

{
  "shelves": [
    {
      "shelfCode": "SHELF-001",
      "tierCount": 3,
      "width": 2,
      "depth": 1,
      "maxCapacity": 1000
    },
    {
      "shelfCode": "SHELF-002",
      "tierCount": 3,
      "width": 2,
      "depth": 1,
      "maxCapacity": 1000
    }
  ]
}
```

**Response:**
```json
{
  "message": "2 shelf(s) created successfully",
  "data": [
    {
      "shelf_id": "shelf_id_1",
      "shelf_code": "SHELF-001",
      "warehouse_id": "warehouse_id_here",
      "tier_count": 3,
      "width": 2,
      "depth": 1,
      "max_capacity": 1000,
      "status": "AVAILABLE",
      "created_at": "2026-01-23T...",
      "updated_at": "2026-01-23T..."
    },
    {
      "shelf_id": "shelf_id_2",
      "shelf_code": "SHELF-002",
      ...
    }
  ]
}
```

**Lưu `shelf_id` đầu tiên**: `69777afceb5a4c97bab420a0`  
**Lưu `shelf_id` thứ hai**: `69777afceb5a4c97bab420a1`

---

## Bước 3: Tạo Contract cho Customer

### 3.1. Manager tạo Contract

```http
POST /api/contracts
Authorization: Bearer {{managerToken}}
Content-Type: application/json

{
  "customerId": "{{customerId}}",
  "warehouseId": "{{warehouseId}}",
  "rentedShelves": [
    {
      "shelfId": "{{shelfId1}}",
      "area": 6,
      "capacity": 3000,
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-12-31T23:59:59.999Z",
      "price": 10000
    },
    {
      "shelfId": "{{shelfId2}}",
      "area": 6,
      "capacity": 3000,
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-12-31T23:59:59.999Z",
      "price": 10000
    }
  ]
}
```

**Response:**
```json
{
  "message": "Contract created successfully",
  "data": {
    "contract_id": "contract_id_here",
    "contract_code": "CONTRACT-XXXXXX",
    "customer_id": "customer_id_here",
    "warehouse_id": "warehouse_id_here",
    "rented_shelves": [...],
    "status": "draft",
    "created_by": "...",
    "created_at": "2026-01-23T...",
    "updated_at": "2026-01-23T..."
  }
}
```

**Lưu `contract_id`**: `69777beaeb5a4c97bab420bc`  
**Lưu `contract_code`**: `CT-MKV9T6I9-LBEH`

---

### 3.2. Manager kích hoạt Contract (chuyển sang active)

```http
PATCH /api/contracts/{{contractId}}/status
Authorization: Bearer {{managerToken}}
Content-Type: application/json

{
  "status": "active"
}
```

**Response:**
```json
{
  "message": "Contract status updated successfully",
  "data": {
    "contract_id": "contract_id_here",
    "status": "active",
    ...
  }
}
```

---

## Bước 4: Tạo Stored Items (để có dữ liệu kiểm kê)

### 4.1. Customer tạo Inbound Request

```http
POST /api/storage-requests/inbound
Authorization: Bearer {{customerToken}}
Content-Type: application/json

{
  "contractId": "{{contractId}}",
  "items": [
    {
      "shelfId": "{{shelfId1}}",
      "itemName": "Product A",
      "quantity": 100,
      "unit": "pcs"
    },
    {
      "shelfId": "{{shelfId1}}",
      "itemName": "Product B",
      "quantity": 50,
      "unit": "pcs"
    },
    {
      "shelfId": "{{shelfId2}}",
      "itemName": "Product C",
      "quantity": 75,
      "unit": "pcs"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Inbound request created successfully",
  "data": {
    "requestId": "inbound_request_id",
    "contractId": "contract_id_here",
    "status": "PENDING",
    "requestType": "IN",
    "items": [...],
    "createdAt": "2026-01-23T..."
  }
}
```

**Lưu `requestId`**: `69777ce3eb5a4c97bab420cf`

---

### 4.2. Manager approve Inbound Request

```http
PATCH /api/inbound-requests/{{inboundRequestId}}/approval
Authorization: Bearer {{managerToken}}
Content-Type: application/json

{
  "decision": "APPROVED",
  "note": "Approved for testing"
}
```

**Response:**
```json
{
  "message": "Inbound request approval updated successfully",
  "data": {
    "inbound_request_id": "inbound_request_id",
    "final_status": "APPROVED",
    ...
  }
}
```

---

### 4.3. Staff complete Inbound Request

**Lấy request details trước:**
```http
GET /api/inbound-requests/{{inboundRequestId}}
Authorization: Bearer {{managerToken}}
```

**Response sẽ có `items` với `requestDetailId`:**

```http
PATCH /api/staff/storage-requests/{{inboundRequestId}}/complete
Authorization: Bearer {{staffToken}}
Content-Type: application/json

{
  "items": [
    {
      "requestDetailId": "request_detail_id_1",
      "quantityActual": 100
    },
    {
      "requestDetailId": "69777ce3eb5a4c97bab420d2",
      "quantityActual": 50
    },
    {
      "requestDetailId": "request_detail_id_3",
      "quantityActual": 75
    }
  ]
}
```

**Response:**
```json
{
  "message": "Storage request completed by staff successfully",
  "data": {
    "request_id": "inbound_request_id",
    "request_type": "IN",
    "final_status": "DONE_BY_STAFF",
    "items": [...],
    "updated_at": "2026-01-23T..."
  }
}
```

---

### 4.4. Customer confirm Storage Request

```http
PATCH /api/storage-requests/{{inboundRequestId}}/confirm
Authorization: Bearer {{customerToken}}
```

**Response:**
```json
{
  "message": "Storage request confirmed successfully",
  "data": {
    "request_id": "inbound_request_id",
    "status": "COMPLETED",
    ...
  }
}
```

**Bây giờ đã có stored items trong hệ thống để test cycle count!**

---

## Bước 5: Test Cycle Count APIs

### 5.1. Customer tạo Cycle Count Request

```http
POST /api/cycle-counts
Authorization: Bearer {{customerToken}}
Content-Type: application/json

{
  "contractId": "{{contractId}}",
  "storedItemIds": ["{{storedItemId1}}", "{{storedItemId2}}"],
  "note": "Monthly cycle count - selected items",
  "preferredDate": "2026-01-25T00:00:00.000Z"
}
```

**Hoặc để đếm TẤT CẢ stored items trong contract (không truyền `storedItemIds`):**
```json
{
  "contractId": "{{contractId}}",
  "note": "Monthly cycle count - all items"
}
```

**Response:**
```json
{
  "message": "Cycle count request created successfully",
  "data": {
    "cycle_count_id": "cycle_count_id_here",
    "contract_id": "contract_id_here",
    "contract_code": "CONTRACT-XXXXXX",
    "customer_id": "customer_id_here",
    "customer_name": "Customer Test",
    "status": "PENDING_MANAGER_APPROVAL",
    "note": "Monthly cycle count",
    "preferred_date": "2026-01-25T00:00:00.000Z",
    "requested_at": "2026-01-23T...",
    "warehouse_id": "warehouse_id_here",
    "warehouse_name": "Warehouse A",
    "created_at": "2026-01-23T...",
    "updated_at": "2026-01-23T..."
  }
}
```

**Lưu `cycle_count_id`**: `697781301fc3b42453c4d18c`

---

### 5.2. Manager xem danh sách Cycle Counts

```http
GET /api/cycle-counts
Authorization: Bearer {{managerToken}}
```

**Response:**
```json
{
  "message": "Cycle counts retrieved successfully",
  "data": [
    {
      "cycle_count_id": "cycle_count_id_here",
      "contract_code": "CONTRACT-XXXXXX",
      "customer_name": "Customer Test",
      "status": "PENDING_MANAGER_APPROVAL",
      ...
    }
  ]
}
```

---

### 5.3. Manager xem chi tiết Cycle Count

```http
GET /api/cycle-counts/{{cycleCountId}}
Authorization: Bearer {{managerToken}}
```

---

### 5.4. Manager approve Cycle Count Request

```http
PUT /api/cycle-counts/{{cycleCountId}}/approve
Authorization: Bearer {{managerToken}}
Content-Type: application/json

{
  "decision": "APPROVED"
}
```

**Response:**
```json
{
  "message": "Cycle count approved successfully",
  "data": {
    "cycle_count_id": "cycle_count_id_here",
    "status": "ASSIGNED_TO_STAFF",
    "approved_at": "2026-01-23T...",
    "approved_by": {
      "user_id": "manager_id",
      "name": "Manager Test",
      "email": "manager@test.com"
    },
    ...
  }
}
```

**Hoặc reject:**
```json
{
  "decision": "REJECTED",
  "rejectionReason": "Not enough time to complete"
}
```

---

### 5.5. Manager assign Staff cho Cycle Count

**Lấy danh sách staff trước (nếu cần):**
```http
GET /api/users
Authorization: Bearer {{adminToken}}
```

**Assign staff:**
```http
PUT /api/cycle-counts/{{cycleCountId}}/assign-staff
Authorization: Bearer {{managerToken}}
Content-Type: application/json

{
  "staffIds": ["{{staffId}}"],
  "countingDeadline": "2026-01-30T23:59:59.999Z"
}
```

**Response:**
```json
{
  "message": "Staff assigned successfully",
  "data": {
    "cycle_count_id": "cycle_count_id_here",
    "status": "ASSIGNED_TO_STAFF",
    "counting_deadline": "2026-01-30T23:59:59.999Z",
    "assigned_staff": [
      {
        "user_id": "staff_id",
        "name": "Staff Test",
        "email": "staff@test.com",
        "assigned_at": "2026-01-23T..."
      }
    ],
    ...
  }
}
```

---

### 5.6. Staff xem Cycle Counts được assign

```http
GET /api/cycle-counts
Authorization: Bearer {{staffToken}}
```

**Response chỉ trả về cycle counts được assign cho staff này.**

---

### 5.7. Staff xem chi tiết Cycle Count để đếm

```http
GET /api/cycle-counts/{{cycleCountId}}
Authorization: Bearer {{staffToken}}
```

**Cần lấy thông tin stored items để biết cần đếm gì.**

**Lấy stored items trong contract:**
```http
GET /api/stored-items/my?contractId={{contractId}}
Authorization: Bearer {{customerToken}}
```

**Response:**
```json
{
  "message": "Stored items retrieved successfully",
  "data": [
    {
      "stored_item_id": "stored_item_id_1",
      "contract_id": "contract_id_here",
      "shelf_id": "shelf_id_1",
      "item_name": "Product A",
      "quantity": 100,
      "unit": "pcs",
      "updated_at": "2026-01-23T..."
    },
    {
      "stored_item_id": "stored_item_id_2",
      "shelf_id": "shelf_id_1",
      "item_name": "Product B",
      "quantity": 50,
      "unit": "pcs",
      ...
    },
    {
      "stored_item_id": "stored_item_id_3",
      "shelf_id": "shelf_id_2",
      "item_name": "Product C",
      "quantity": 75,
      "unit": "pcs",
      ...
    }
  ]
}
```

**Lưu các `stored_item_id`**: `storedItemId1`, `storedItemId2`, `storedItemId3`

---

### 5.8. Staff submit Cycle Count Result

```http
PUT /api/cycle-counts/{{cycleCountId}}/submit-result
Authorization: Bearer {{staffToken}}
Content-Type: application/json

{
  "items": [
    {
      "storedItemId": "{{storedItemId1}}",
      "shelfId": "{{shelfId1}}",
      "countedQuantity": 98,
      "note": "Found 2 missing items"
    },
    {
      "storedItemId": "{{storedItemId2}}",
      "shelfId": "{{shelfId1}}",
      "countedQuantity": 50,
      "note": "Match"
    },
    {
      "storedItemId": "{{storedItemId3}}",
      "shelfId": "{{shelfId2}}",
      "countedQuantity": 77,
      "note": "Found 2 extra items"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Cycle count result submitted successfully",
  "data": {
    "cycle_count_id": "cycle_count_id_here",
    "status": "STAFF_SUBMITTED",
    "completed_at": "2026-01-23T...",
    "items": [
      {
        "item_id": "...",
        "stored_item_id": "stored_item_id_1",
        "shelf_id": "shelf_id_1",
        "shelf_code": "SHELF-001",
        "item_name": "Product A",
        "unit": "pcs",
        "system_quantity": 100,
        "counted_quantity": 98,
        "discrepancy": -2,
        "note": "Found 2 missing items"
      },
      {
        "item_id": "...",
        "stored_item_id": "stored_item_id_2",
        "shelf_id": "shelf_id_1",
        "shelf_code": "SHELF-001",
        "item_name": "Product B",
        "unit": "pcs",
        "system_quantity": 50,
        "counted_quantity": 50,
        "discrepancy": 0,
        "note": "Match"
      },
      {
        "item_id": "...",
        "stored_item_id": "stored_item_id_3",
        "shelf_id": "shelf_id_2",
        "shelf_code": "SHELF-002",
        "item_name": "Product C",
        "unit": "pcs",
        "system_quantity": 75,
        "counted_quantity": 77,
        "discrepancy": 2,
        "note": "Found 2 extra items"
      }
    ],
    ...
  }
}
```

---

### 5.9. Manager xem kết quả và discrepancies

```http
GET /api/cycle-counts/{{cycleCountId}}
Authorization: Bearer {{managerToken}}
```

**Response sẽ có `items` với `discrepancy` đã được tính toán.**

---

### 5.10. Manager hoặc Customer confirm Cycle Count

**Option 1: Manager confirm**
```http
PUT /api/cycle-counts/{{cycleCountId}}/confirm
Authorization: Bearer {{managerToken}}
```

**Option 2: Customer confirm**
```http
PUT /api/cycle-counts/{{cycleCountId}}/confirm
Authorization: Bearer {{customerToken}}
```

**Response:**
```json
{
  "message": "Cycle count confirmed successfully",
  "data": {
    "cycle_count_id": "cycle_count_id_here",
    "status": "CONFIRMED",
    "confirmed_at": "2026-01-23T...",
    "confirmed_by": {
      "user_id": "...",
      "name": "...",
      "email": "..."
    },
    ...
  }
}
```

---

### 5.11. Manager request Recount (nếu cần)

```http
PUT /api/cycle-counts/{{cycleCountId}}/request-recount
Authorization: Bearer {{managerToken}}
```

**Response:**
```json
{
  "message": "Recount requested successfully",
  "data": {
    "cycle_count_id": "cycle_count_id_here",
    "status": "ASSIGNED_TO_STAFF",
    "completed_at": null,
    ...
  }
}
```

**Status sẽ reset về `ASSIGNED_TO_STAFF` và staff có thể submit lại.**

---

## Tóm tắt Flow hoàn chỉnh

1. ✅ Tạo accounts: Admin, Manager, Staff, Customer
2. ✅ Admin kích hoạt tất cả accounts
3. ✅ Manager tạo Warehouse
4. ✅ Manager tạo Shelves
5. ✅ Manager tạo Contract cho Customer
6. ✅ Manager activate Contract
7. ✅ Customer tạo Inbound Request
8. ✅ Manager approve Inbound Request
9. ✅ Staff complete Inbound Request
10. ✅ Customer confirm Storage Request
11. ✅ **Customer tạo Cycle Count Request**
12. ✅ **Manager approve Cycle Count**
13. ✅ **Manager assign Staff**
14. ✅ **Staff submit Cycle Count Result**
15. ✅ **Manager/Customer confirm Cycle Count**

---

## Lưu ý quan trọng

1. **Tất cả accounts mới tạo đều `isActive: false`** → Cần Admin kích hoạt trước khi login
2. **Contract phải ở status `active`** mới có thể tạo cycle count
3. **Cycle Count phải có stored items** mới có thể submit result
4. **Staff chỉ thấy cycle counts được assign** cho họ
5. **Discrepancy = countedQuantity - systemQuantity**
   - Dương = thừa
   - Âm = thiếu
   - 0 = khớp
6. **Không tự động điều chỉnh inventory** - chỉ track discrepancies

---

## Variables cần lưu trong Postman

- `adminToken`
- `managerToken`
- `managerId`
- `staffToken`
- `staffId`
- `customerToken`
- `customerId`
- `warehouseId`
- `shelfId1`
- `shelfId2`
- `contractId`
- `contractCode`
- `inboundRequestId`
- `cycleCountId`
- `storedItemId1`
- `storedItemId2`
- `storedItemId3`
