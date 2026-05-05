# TÀI LIỆU API DÀNH CHO FRONTEND

---

##  PHẦN 1: PUBLIC APIs (Dành cho Thành viên 3)
*Ghi chú: Các API này KHÔNG cần gửi kèm Token (Không cần đăng nhập).*

### 1.1. Lấy danh sách Danh mục
- **URL:** `GET /api/public/categories`
- **Output (Response):** Mảng chứa các danh mục.
```json
[
  { "id": 1, "name": "Whey Protein", "slug": "whey-protein", "isActive": true },
  { "id": 2, "name": "Pre-Workout", "slug": "pre-workout", "isActive": true }
]
```

### 1.2. Lấy danh sách Sản phẩm (Có phân trang & Tìm kiếm)
- **URL:** `GET /api/public/products`
- **Query Parameters (Tùy chọn):**
  - `page`: Trang hiện tại (Mặc định: 0)
  - `size`: Số lượng sản phẩm trên 1 trang (Mặc định: 10)
  - `categoryId`: Truyền ID để lọc theo danh mục
  - `keyword`: Truyền chữ để tìm kiếm theo tên
  - *Ví dụ:* `/api/public/products?page=0&size=10&keyword=Whey&categoryId=1`
- **Output (Response):** Dữ liệu phân trang (Page)
```json
{
  "content": [
    {
      "id": 1,
      "name": "Whey Gold Standard",
      "price": 1500000.00,
      "categoryId": 1,
      "categoryName": "Whey Protein"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10
  },
  "totalElements": 25,
  "totalPages": 3,
  "last": false
}
```

### 1.3. Lấy chi tiết 1 Sản phẩm
- **URL:** `GET /api/public/products/{id}` (Ví dụ: `/api/public/products/1`)
- **Output (Response):** Object chứa chi tiết 1 sản phẩm.

---

##  PHẦN 2: PROTECTED APIs (Dành cho Thành viên 4)
*Ghi chú: Tất cả các API này BẮT BUỘC phải truyền Header: `Authorization: Bearer <token_của_user_đang_đăng_nhập>`*

### 2.1. Lấy Thông tin cá nhân (Profile)
- **URL:** `GET /api/users/profile`
- **Output (Response):**
```json
{
  "id": 5,
  "fullName": "Nguyễn Văn A",
  "email": "nva@gmail.com",
  "phone": "0987654321",
  "role": "CUSTOMER"
}
```

### 2.2. Lịch sử Mua hàng
- **URL:** `GET /api/orders/my-orders`
- **Output (Response):** Danh sách các đơn hàng đã đặt (Mới nhất xếp trên).
```json
[
  {
    "id": 10,
    "orderCode": "ORD-F4A9C1",
    "totalAmount": 3000000.00,
    "status": "PENDING",
    "placedAt": "2026-05-03T10:00:00",
    "items": [
      {
        "productId": 1,
        "productName": "Whey Gold",
        "quantity": 2,
        "unitPrice": 1500000.00,
        "lineTotal": 3000000.00
      }
    ]
  }
]
```

### 2.3. Tạo Đơn Hàng (Checkout)
- **URL:** `POST /api/orders/create`
- **Body Request (Input JSON gửi lên từ Giỏ hàng):**
```json
{
  "recipientName": "Nguyễn Văn A",
  "recipientPhone": "0987654321",
  "shippingAddressLine1": "123 Đường Số 1",
  "shippingCity": "Hồ Chí Minh",
  "shippingProvince": "Quận 1",
  "note": "Giao vào giờ hành chính",
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 5,
      "quantity": 1
    }
  ]
}
```
*(Ghi chú: Frontend KHÔNG cần truyền tổng tiền hay giá tiền sản phẩm, Backend sẽ tự tra DB để tính nhằm chống hack giá).*
- **Output (Response):** Trả về toàn bộ thông tin đơn hàng vừa được tạo thành công kèm theo Mã đơn hàng (OrderCode).
