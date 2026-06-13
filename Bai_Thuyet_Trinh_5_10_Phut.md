# Bài Thuyết Trình: Module Đặt Hàng & Thanh Toán — ProFit

**Sinh viên:** [Tên của bạn]
**Đề tài:** Nền tảng Thương mại Điện tử ProFit — Thực phẩm Bổ sung Thể thao
**Công nghệ:** Spring Boot 4.0 (Java 21) + React 18

---

## MỤC LỤC

1. [Tổng quan module](#1-tổng-quan-module)
2. [Sơ đồ luồng hoạt động tổng thể](#2-sơ-đồ-luồng-hoạt-động-tổng-thể)
3. [Chi tiết từng bước trong luồng](#3-chi-tiết-từng-bước-trong-luồng)
4. [Ba phương thức thanh toán](#4-ba-phương-thức-thanh-toán)
5. [Hướng xử lý logic Backend](#5-hướng-xử-lý-logic-backend)
6. [Trạng thái đơn hàng & Payment Status](#6-trạng-thái-đơn-hàng--payment-status)
7. [Database Schema (JPA Entities)](#7-database-schema-jpa-entities)
8. [Tóm tắt & Kết luận](#8-tóm-tắt--kết-luận)

---

## 1. Tổng quan module

Module Đặt hàng & Thanh toán của ProFit bao gồm toàn bộ quy trình từ lúc khách hàng thêm sản phẩm vào giỏ hàng, điền thông tin giao hàng, chọn phương thức thanh toán, cho đến khi đơn hàng được tạo, xác nhận và theo dõi trạng thái.

### 1.1 Mục tiêu thiết kế

- **Hỗ trợ 2 loại khách hàng:** Khách đã đăng ký (authenticated) và khách vãng lai (guest) — không bắt buộc đăng nhập mới được đặt hàng
- **3 phương thức thanh toán:** COD, Chuyển khoản ngân hàng (QR), VNPAY (QR/ATM)
- **Quản lý trạng thái đơn hàng chi tiết:** từ PENDING → CONFIRMED → SHIPPED → DELIVERED → COMPLETED
- **Tự động xử lý thanh toán:** VNPAY sử dụng cơ chế IPN (Instant Payment Notification) server-to-server

### 1.2 Các thành phần chính

| Tầng | Thành phần | Vai trò |
|------|-----------|---------|
| **Frontend** | `CartPage.jsx` | Hiển thị giỏ hàng, tăng/giảm số lượng, xóa sản phẩm |
| **Frontend** | `CheckoutPage.jsx` | Điền thông tin giao hàng, chọn phương thức thanh toán |
| **Frontend** | `BankingQRPage.jsx` | Hiển thị QR code ngân hàng BIDV để quét và chuyển khoản |
| **Frontend** | `OrderPage.jsx` | Trang theo dõi đơn hàng của khách |
| **Backend** | `OrderController.java` | REST API tạo đơn, lấy đơn, hủy đơn |
| **Backend** | `BankingPaymentController.java` | API xác nhận banking, đếm đơn chờ |
| **Backend** | `VNPayController.java` | API tạo URL thanh toán, IPN callback, Return URL |
| **Backend** | `OrderServiceImpl.java` | Business logic xử lý đơn hàng |
| **Backend** | `VNPayService.java` | Logic tạo URL & verify checksum VNPAY |
| **Entity** | `Order.java` | Entity đơn hàng (15 trường) |
| **Entity** | `OrderItem.java` | Entity chi tiết sản phẩm trong đơn |

---

## 2. Sơ đồ luồng hoạt động tổng thể

```
Khách hàng
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 1: GIỎ HÀNG (CartPage)                                          │
│  • Thêm / sửa / xóa sản phẩm                                           │
│  • Tính tạm tính (subtotal)                                            │
│  • Tính phí vận chuyển: ≥500K → Miễn phí, <500K → 30.000đ            │
│  • Lưu trong localStorage của trình duyệt                              │
└────────────┬────────────────────────────────────────────────────────────┘
             │  Nhấn "Tiến hành thanh toán"
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 2: CHECKOUT (CheckoutPage)                                        │
│  • Hiển thị thông tin giao hàng (đã lưu hoặc chưa)                    │
│  • Chọn phương thức thanh toán: COD | Banking | VNPAY                  │
│  • Xem tóm tắt đơn hàng                                                │
│  • Nhấn "Đặt hàng ngay"                                                │
└────────────┬────────────────────────────────────────────────────────────┘
             │  Gọi API tạo đơn hàng
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 3: TẠO ĐƠN HÀNG (Backend: OrderController)                      │
│                                                                         │
│  ┌─ Đã đăng nhập  ──► POST /api/orders/create  (JWT required)         │
│  └─ Khách vãng lai  ──► POST /api/orders/guest  (no auth)             │
│                                                                         │
│  Backend:                                                               │
│  • Validate thông tin                                                   │
│  • Tạo mã đơn ORD-XXXXXXXX (8 ký tự ngẫu nhiên)                       │
│  • Lưu vào bảng orders + order_items                                   │
│  • Trả về OrderResponse cho frontend                                    │
└────────────┬────────────────────────────────────────────────────────────┘
             │
    ┌────────┴──────────┬──────────────────────┐
    │                   │                      │
    ▼                   ▼                      ▼
┌─────────┐      ┌──────────────┐      ┌──────────────┐
│  COD    │      │  BANKING QR  │      │   VNPAY QR   │
│(Thanh   │      │ (Chuyển     │      │ (Thanh toán  │
│toán     │      │ khoản ngân  │      │ qua cổng    │
│khi      │      │ hàng)       │      │ VNPAY)       │
│nhận    │      │              │      │              │
│hàng)   │      │              │      │              │
└────┬────┘      └──────┬───────┘      └──────┬───────┘
     │                   │                     │
     │ Lưu localOrders   │ Hiển thị QR code    │ Gọi API tạo URL
     │ Chuyển trang      │ BIDV                │ VNPAY
     │ order-success      │                     │ Redirect đến
     │                   │ Quét & chuyển khoản │ sandbox.vnpayment.vn
     │                   │                     │
     │                   ▼                     ▼
     │           ┌──────────────┐      ┌──────────────────────┐
     │           │ Nhấn "Đã    │      │ VNPAY Sandbox        │
     │           │ thanh toán" │      │ (Test UI)            │
     │           └──────┬───────┘      └──────────┬───────────┘
     │                  │                        │
     │                  ▼                        ▼
     │           ┌──────────────┐      ┌──────────────────────┐
     │           │ Backend:    │      │ 1. IPN: Backend nhận │
     │           │ POST       │      │    callback → cập    │
     │           │ /v1/banking│      │    nhật PAID/CONFIRM │
     │           │ /confirm    │      │                      │
     │           │            │      │ 2. Return URL: FE    │
     │           │ Trạng thái: │      │    redirect về      │
     │           │ UNPAID →   │      │    /vnpay-return     │
     │           │ PENDING_   │      │    hiển thị kết quả │
     │           │ CONFIRM    │      │                      │
     │           └──────┬───────┘      └──────────┬───────────┘
     │                  │                        │
     └──────────────────┴────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  ORDER SERVICE (Business Logic) │
            │  • createOrder / createGuestOrder │
            │  • confirmBankingPayment      │
            │  • cancelOrder               │
            │  • updateOrderStatus         │
            │  • updatePaymentSuccess      │
            │  • reduceStock / restoreStock │
            └──────────────────┬───────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  MySQL Database     │
                    │  (ProFitSuppsDB)   │
                    │  tables: orders,    │
                    │  order_items       │
                    └─────────────────────┘
```

---

## 3. Chi tiết từng bước trong luồng

### Bước 1 — Giỏ hàng (CartPage)

**Frontend: `CartPage.jsx`**

Khi khách hàng thêm sản phẩm vào giỏ, dữ liệu được lưu trong `localStorage` với cấu trúc:

```javascript
// Key: "profit_cart"
// Value: Array of cart items
[
  {
    product: { id, name, price, image, brand, ... },
    qty: 2
  },
  {
    product: { id, name, price, image, brand, ... },
    qty: 1
  }
]
```

**Tính toán phí vận chuyển tại frontend:**

```javascript
const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
const shipping = subtotal >= 500000 ? 0 : 30000;  // Miễn phí ship khi >= 500K
const total = subtotal + shipping;
```

- **subtotal**: Tổng giá trị sản phẩm
- **shipping**: 30.000đ nếu dưới 500.000đ, miễn phí nếu từ 500.000đ trở lên
- **total**: subtotal + shipping

**Thao tác trên giỏ hàng:**
- Tăng/giảm số lượng: gọi `onUpdateQty(productId, newQty)`
- Xóa sản phẩm: gọi `onRemove(productId)`
- Chuyển sang checkout: nhấn nút "Tiến hành thanh toán"

---

### Bước 2 — Checkout (CheckoutPage)

**Frontend: `CheckoutPage.jsx`**

Trang checkout thực hiện 2 nhiệm vụ chính:

**A) Hiển thị thông tin giao hàng**
- Nếu đã đăng nhập: tự động điền từ profile user (lấy từ `localStorage` key `userInfo_${email}`)
- Nếu chưa đăng nhập: dùng thông tin guest đã lưu hoặc yêu cầu nhập mới
- Các trường: Họ tên, SĐT, Email, Địa chỉ, Quận/Huyện, Tỉnh/TP, Ghi chú

**B) Chọn phương thức thanh toán**
- Radio button với 3 lựa chọn:
  - `cod` — Thanh toán khi nhận hàng (COD)
  - `banking` — Chuyển khoản ngân hàng (ATM/Ví)
  - `vnpay` — Thanh toán qua cổng VNPAY (QR/ATM)

**Validate trước khi đặt hàng:**

```javascript
const hasRequiredInfo = useMemo(() => {
  return (
    userInfo.fullName?.trim() &&    // Họ tên
    userInfo.phone?.trim() &&       // SĐT
    userInfo.address?.trim() &&     // Địa chỉ
    userInfo.city?.trim()           // Thành phố
  );
}, [userInfo]);
```

Nếu thiếu thông tin → redirect sang trang profile để bổ sung.

---

### Bước 3 — Tạo đơn hàng (Backend: OrderController + OrderServiceImpl)

**Gọi API:**

```
POST /api/orders/create       ← Khách đã đăng nhập (JWT required)
POST /api/orders/guest        ← Khách vãng lai (no auth)
```

**Request body (OrderRequest):**

```json
{
  "recipientName": "Nguyễn Văn A",
  "recipientPhone": "0912345678",
  "shippingAddressLine1": "123 Đường ABC, Phường XYZ",
  "shippingCity": "TP. Hồ Chí Minh",
  "shippingProvince": "Hồ Chí Minh",
  "note": "Giao giờ hành chính",
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 5, "quantity": 1 }
  ]
}
```

**Logic tạo đơn tại `OrderServiceImpl.createOrder()`:**

```
1. Tìm user trong DB bằng email (từ JWT token)
2. Tạo object Order mới
3. Sinh mã đơn: "ORD-" + 8 ký tự UUID ngẫu nhiên (VD: ORD-A3F2B1C7)
4. Gán thông tin giao hàng (recipientName, phone, address, city, province)
5. Duyệt từng item trong request:
   - Tìm Product trong DB bằng productId
   - Tạo OrderItem: ghi nhận productName, SKU, quantity, unitPrice, lineTotal
   - Tính lineTotal = unitPrice × quantity
   - Cộng dồn vào totalAmount
6. Lưu Order (cascade sẽ tự động lưu các OrderItem)
7. Trả về OrderResponse (bao gồm orderCode, id, totalAmount, status, ...)
```

**Guest Order (`createGuestOrder`):** Logic tương tự, nhưng thay vì tìm user từ JWT, hệ thống gán đơn cho user nội bộ `__guest__@system.internal` để quản lý riêng.

---

## 4. Ba phương thức thanh toán

### 4.1 COD — Cash on Delivery

**Luồng xử lý:**

```
Frontend: Chọn COD
    │
    ▼
Gọi API tạo đơn → Backend tạo order (status: PENDING, paymentStatus: UNPAID)
    │
    ▼
Lưu vào localStorage key "localOrders"
    │
    ▼
Navigate sang trang order-success (thành công)
    │
    ▼
Khách hàng theo dõi đơn tại OrderPage
```

**Đặc điểm:**
- Đơn hàng được tạo ngay với trạng thái `PENDING` / `UNPAID`
- Admin sau đó xác nhận đơn, giao hàng và thu tiền khi nhận
- Không có bước thanh toán trực tuyến

---

### 4.2 Banking QR — Chuyển khoản ngân hàng

**Frontend: `BankingQRPage.jsx`**

**Luồng xử lý:**

```
Frontend: Chọn Banking → Nhấn "Đặt hàng ngay"
    │
    ▼
Gọi API tạo đơn → Backend tạo order (status: PENDING, paymentStatus: UNPAID)
    │
    ▼
Lưu order vào localStorage key "pendingBankingOrder"
    │
    ▼
Navigate sang BankingQRPage → Hiển thị QR code BIDV
    │
    ▼
Khách hàng mở app ngân hàng, quét QR code
    │
    ▼
Khách hàng nhấn nút "Đã thanh toán online qua ngân hàng"
    │
    ▼
Frontend: Gọi POST /api/v1/banking/confirm/{orderId}
    │
    ▼
Backend: updatePaymentStatus UNPAID → PENDING_CONFIRM
         (admin sẽ kiểm tra biến động số dư tài khoản để xác nhận)
```

**Tạo nội dung QR Code:**

```javascript
const qrContent = `bidv:${BANK_INFO.accountNumber}?acc_name=${BANK_INFO.accountHolder}&amount=${paymentAmount}&memo=Thanh toan don hang ${orderCode}`;
```

**Thông tin tài khoản admin (cấu hình trong `BankingQRPage.jsx`):**

| Trường | Giá trị |
|--------|---------|
| Ngân hàng | BIDV |
| Số tài khoản | `8890014407` |
| Tên tài khoản | `Le Vu Hao` |
| Chi nhánh | BIDV-PGD Phù Cát |

**Tính năng:** QR code được tạo bằng Google Charts API: `https://api.qrserver.com/v1/create-qr-code/`

---

### 4.3 VNPAY — Cổng thanh toán trực tuyến

**Backend: `VNPayController.java` + `VNPayService.java`**

**Luồng xử lý:**

```
Frontend: Chọn VNPAY → Nhấn "Đặt hàng ngay"
    │
    ▼
Gọi API tạo đơn → Backend tạo order (status: PENDING, paymentStatus: UNPAID)
    │
    ▼
Frontend: Gọi POST /api/v1/vnpay/create
    │
    ▼
Backend tạo URL thanh toán VNPAY:
   https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...&vnp_TxnRef=...&...
    │
    ▼
Frontend: Redirect trình duyệt đến URL VNPAY (window.location.href)
    │
    └──────────────────────┐
                           │
            ┌──────────────┴──────────────┐
            │    VNPAY Sandbox (Test UI)   │
            │    Người dùng nhập thẻ test  │
            └──────────────┬───────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │ Thành công      │ Thất bại         │
         │                 │                  │
         ▼                 ▼                  ▼
┌──────────────────┐  ┌──────────────────────────┐
│ 1. IPN Callback   │  │ 1. IPN Callback            │
│    (server-to-   │  │    (server-to-server)      │
│    server)       │  │                            │
│                  │  │ Backend:                   │
│ Backend:         │  │ updatePaymentFailed()      │
│ updatePayment    │  │ → paymentStatus = FAILED  │
│ Success()        │  │                            │
│ → status =       │  │ 2. Return URL redirect     │
│    CONFIRMED     │  │    về /vnpay-return       │
│ → paymentStatus  │  │    Hiển thị thông báo    │
│    = PAID        │  │    "Thanh toán thất bại"  │
│                  │  │                            │
│ 2. Return URL:   │  │                            │
│    redirect FE   │  │                            │
│    về /vnpay-    │  │                            │
│    return        │  │                            │
│    (hiển thị     │  │                            │
│    kết quả)      │  │                            │
└──────────────────┘  └────────────────────────────┘
```

**Ba endpoint VNPAY:**

| Endpoint | Method | Mục đích | Ai gọi |
|----------|--------|----------|--------|
| `/api/v1/vnpay/create` | POST | Tạo URL thanh toán VNPAY | Frontend |
| `/api/v1/vnpay/ipn` | POST | IPN — cập nhật trạng thái đơn hàng server-to-server | VNPAY server |
| `/api/v1/vnpay/return` | GET | Return URL — redirect khách về website | Trình duyệt khách |

**Tạo URL thanh toán VNPAY (`VNPayService.createPaymentUrl`):**

```java
// Các tham số bắt buộc
vnp_Version    = "2.1.0"
vnp_Command    = "pay"
vnp_TmnCode    = "SY273SZH"         // Terminal ID từ VNPAY Sandbox
vnp_Amount     = amount * 100       // VNPAY yêu cầu nhân 100
vnp_CurrCode   = "VND"
vnp_Locale     = "vn" hoặc "en"
vnp_OrderType  = "other"
vnp_TxnRef     = orderCode + "_" + timestamp  // Mã tham chiếu giao dịch
vnp_OrderInfo  = "Thanh toan don hang ORD-XXXXXXXX - ProFit"
vnp_ReturnUrl  = "http://localhost:5173/vnpay-return"
vnp_IpnUrl     = "http://localhost:8080/ProFitSuppsDB/api/v1/vnpay/ipn"

// Tạo Secure Hash (HMAC-SHA512)
vnp_SecureHash = HMAC_SHA512(all_params, hash_secret)
```

**Xử lý IPN tại `VNPayController.handleIpn()`:**

```java
// 1. Verify checksum
if (!vnPayService.verifyIpn(params)) {
    return "{\"RspCode\":\"97\",\"Message\":\"Invalid signature\"}";
}

// 2. Parse response
VNPayResponse resp = vnPayService.parseResponse(params);

// 3. Extract orderCode từ txnRef (format: ORD-XXXXXXXX_timestamp)
String txnRef = resp.getTxnRef();
String orderCode = txnRef.contains("_") ? txnRef.substring(0, txnRef.lastIndexOf("_")) : txnRef;

// 4. Cập nhật DB
if (resp.isSuccess()) {
    orderService.updatePaymentSuccess(orderCode, transactionNo);
    // → status = CONFIRMED, paymentStatus = PAID
    return "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}";
} else {
    orderService.updatePaymentFailed(orderCode);
    // → paymentStatus = FAILED
    return "{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}";
}
```

---

## 5. Hướng xử lý logic Backend

### 5.1 OrderServiceImpl — Các method chính

```
OrderServiceImpl
├── createOrder(request, email)
│   └── Tạo đơn cho user đã đăng nhập
│       ✓ Sinh mã ORD-XXXXXXXX
│       ✓ Validate & lưu Order + OrderItem
│       ✓ Tính totalAmount từ tổng lineTotal
│
├── createGuestOrder(request)
│   └── Tạo đơn cho khách vãng lai
│       ✓ Gán user = __guest__@system.internal
│       ✓ Cùng logic tạo đơn
│
├── confirmBankingPayment(orderId, userEmail)
│   └── Xác nhận banking
│       ✓ Verify quyền sở hữu đơn (user hoặc guest)
│       ✓ paymentStatus: UNPAID → PENDING_CONFIRM
│       ✓ paymentMethod: "BANKING"
│       ✓ paidAt: thời gian hiện tại
│
├── cancelOrder(orderId, userEmail)
│   └── Khách tự hủy đơn
│       ✓ Chỉ cho hủy khi: status=PENDING HOẶC paymentStatus=PENDING_CONFIRM
│       ✓ status → CANCELLED
│       ✓ Nếu PENDING_CONFIRM → paymentStatus về UNPAID
│
├── updateOrderStatusInternal(id, request, adminOverride)
│   └── Admin cập nhật trạng thái
│       ✓ COMPLETED: gọi reduceStock() → trừ tồn kho
│       ✓ CANCELLED: gọi restoreStock() → hoàn tồn kho
│       ✓ DELIVERED_FAILED: gọi restoreStock()
│       ✓ Nếu paymentStatus = PAID → auto đổi status → CONFIRMED
│
├── markDeliveryFailed(id)
│   └── Đánh dấu giao thất bại
│       ✓ Chỉ khi status = CONFIRMED hoặc DELIVERED
│       ✓ status → DELIVERED_FAILED
│       ✓ Gọi restoreStock()
│
├── updateVNPayTxnRef(orderCode, txnRef)
│   └── Lưu mã giao dịch VNPAY
│       ✓ paymentMethod = "VNPAY"
│       ✓ vnpTxnRef = txnRef
│
├── updatePaymentSuccess(orderCode, transactionNo)
│   └── Xử lý thanh toán VNPAY thành công
│       ✓ paymentStatus = "PAID"
│       ✓ status = "CONFIRMED"
│       ✓ vnpTransactionNo = transactionNo
│       ✓ paidAt = now
│
├── updatePaymentFailed(orderCode)
│   └── Xử lý thanh toán VNPAY thất bại
│       ✓ paymentStatus = "FAILED"
│
├── reduceStock(order)
│   └── Trừ tồn kho khi đơn hoàn thành
│       ∀ item: product.stockQuantity -= item.quantity
│
└── restoreStock(order)
    └── Hoàn tồn kho khi hủy / giao thất bại
        ∀ item: product.stockQuantity += item.quantity
```

### 5.2 Hướng xử lý kho hàng (Stock Management)

```
Đơn hàng được tạo (PENDING)
    │
    ├── COD / Banking: Chưa trừ kho (chờ thanh toán hoặc xác nhận)
    │
    └── Khi status = COMPLETED (hoặc DELIVERED)
        │
        ▼
    reduceStock() → Trừ stockQuantity của từng sản phẩm
    │
    ▼
Khi đơn bị CANCELLED / DELIVERED_FAILED
    │
    ▼
restoreStock() → Hoàn lại stockQuantity
```

**Nguyên tắc:** Hệ thống **KHÔNG trừ kho** ngay khi đặt hàng mà chỉ trừ khi đơn hoàn thành (`COMPLETED`). Điều này tránh tình trạng "kho âm" khi khách đặt nhiều nhưng chưa thanh toán.

### 5.3 Security — Phân quyền API

| Endpoint | Yêu cầu | Ai được phép |
|----------|---------|-------------|
| `POST /api/orders/create` | JWT | User đã đăng nhập |
| `POST /api/orders/guest` | None | Khách vãng lai |
| `GET /api/orders/my-orders` | JWT | User sở hữu đơn |
| `POST /api/orders/{id}/cancel` | JWT | User sở hữu đơn |
| `POST /api/v1/banking/confirm/{id}` | JWT | User sở hữu đơn |
| `GET /api/v1/banking/pending-count` | JWT | Admin |
| `POST /api/v1/vnpay/create` | None (verify qua orderCode) | Công khai |
| `POST /api/v1/vnpay/ipn` | VNPAY hash signature | VNPAY server |
| `GET /api/v1/vnpay/return` | VNPAY hash signature | Trình duyệt |

---

## 6. Trạng thái đơn hàng & Payment Status

### 6.1 Order Status (Trạng thái đơn hàng)

```
PENDING
    │
    ├── COD: Chờ xác nhận → Admin đổi CONFIRMED
    ├── Banking: Chờ admin xác nhận thanh toán → CONFIRMED
    └── VNPAY: IPN cập nhật → CONFIRMED (ngay khi thanh toán thành công)
                │
                ▼
          CONFIRMED
                │ (Admin đóng gói & bàn giao đơn vận chuyển)
                ▼
          SHIPPED
                │ (Đơn vị vận chuyển xác nhận đã giao)
                ▼
          DELIVERED
                │ (Khách hàng xác nhận đã nhận / hết thời gian chờ)
                ▼
          COMPLETED
          (Đơn hoàn tất, stock đã bị trừ)
                │
    ┌───────────┴───────────┐
    │ (Nếu giao thất bại: DELIVERED_FAILED)
    ▼
DELIVERED_FAILED
    (Kho được hoàn lại, admin xử lý đơn lại)
    │
    ├── CANCELLED
    │   └── Khách tự hủy (PENDING) hoặc Admin hủy
    │       (Kho được hoàn lại)
```

**Bảng trạng thái đơn hàng:**

| Trạng thái | Mô tả | Ai thay đổi |
|-----------|-------|------------|
| `PENDING` | Chờ xác nhận | Tự động khi tạo đơn |
| `CONFIRMED` | Đã xác nhận, đang chuẩn bị | Admin |
| `SHIPPED` | Đang giao hàng | Admin |
| `DELIVERED` | Đã giao thành công | Admin |
| `COMPLETED` | Hoàn tất | Admin |
| `DELIVERED_FAILED` | Giao thất bại | Admin |
| `CANCELLED` | Đã hủy | Khách (PENDING) / Admin |

### 6.2 Payment Status (Trạng thái thanh toán)

| Trạng thái | Mô tả | Khi nào |
|-----------|-------|---------|
| `UNPAID` | Chưa thanh toán | Mặc định khi tạo đơn |
| `PENDING_CONFIRM` | Đã chuyển khoản, chờ admin xác nhận | Banking — sau khi khách nhấn "Đã thanh toán" |
| `PAID` | Đã thanh toán thành công | VNPAY IPN thành công / Admin xác nhận banking |
| `FAILED` | Thanh toán thất bại | VNPAY IPN thất bại |

---

## 7. Database Schema (JPA Entities)

### 7.1 Bảng `orders`

```sql
CREATE TABLE orders (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT,                -- NULL cho guest
    order_code          VARCHAR(50) UNIQUE,    -- ORD-A3F2B1C7
    recipient_name      VARCHAR(100) NOT NULL,
    recipient_phone     VARCHAR(20) NOT NULL,
    shipping_address_line1 VARCHAR(255) NOT NULL,
    shipping_city       VARCHAR(100) NOT NULL,
    shipping_province   VARCHAR(100) NOT NULL,
    shipping_country    VARCHAR(100) DEFAULT 'Vietnam',
    subtotal            DECIMAL(15,2),
    discount_amount     DECIMAL(15,2) DEFAULT 0,
    shipping_fee        DECIMAL(15,2) DEFAULT 0,
    total_amount        DECIMAL(15,2) NOT NULL,
    status              VARCHAR(20) DEFAULT 'PENDING',
    payment_status      VARCHAR(20) DEFAULT 'UNPAID',
    payment_method      VARCHAR(50),           -- COD | BANKING | VNPAY
    payment_attempts    INT DEFAULT 0,
    bank_transfer_slip  VARCHAR(500),
    paid_at             DATETIME,
    delivered_at        DATETIME,
    completed_at        DATETIME,
    note                VARCHAR(500),
    vnp_txn_ref         VARCHAR(100),          -- Mã giao dịch VNPAY
    vnp_transaction_no  VARCHAR(50),           -- Số giao dịch từ VNPAY
    placed_at           DATETIME DEFAULT NOW(),
    created_at          DATETIME,
    updated_at          DATETIME
);
```

### 7.2 Bảng `order_items`

```sql
CREATE TABLE order_items (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id       BIGINT NOT NULL,
    product_id     BIGINT NOT NULL,
    product_name   VARCHAR(200) NOT NULL,   -- Lưu snapshot tên sản phẩm
    product_sku    VARCHAR(50) NOT NULL,     -- Lưu snapshot SKU
    quantity       INT NOT NULL,
    unit_price     DECIMAL(15,2) NOT NULL,
    line_total     DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**Thiết kế quan trọng:** Bảng `order_items` lưu **snapshot** của sản phẩm tại thời điểm đặt hàng (`productName`, `productSku`, `unitPrice`). Điều này đảm bảo đơn hàng không bị ảnh hưởng nếu sản phẩm sau này đổi tên, giá, hoặc bị xóa khỏi hệ thống.

---

## 8. Tóm tắt & Kết luận

### Tổng kết luồng hoạt động

```
Khách chọn sản phẩm → Thêm vào giỏ (localStorage)
    → Xem giỏ hàng (CartPage) — tăng/giảm/xóa
        → Checkout (CheckoutPage) — nhập thông tin, chọn phương thức
            → Tạo đơn hàng (OrderController) — sinh ORD-XXXXXXXX
                ├── COD    → Thành công ngay, chờ giao hàng
                ├── Banking → QR code BIDV → chờ xác nhận của admin
                └── VNPAY  → Redirect sang cổng VNPAY
                               ├── Thành công: IPN cập nhật PAID + CONFIRMED
                               └── Thất bại:  IPN cập nhật FAILED
                → Theo dõi đơn hàng (OrderPage)
```

### Điểm mạnh của thiết kế

1. **Hỗ trợ guest checkout** — Khách không cần đăng ký vẫn đặt được hàng
2. **Thanh toán đa kênh** — COD cho tiện lợi, Banking QR cho ai quen chuyển khoản, VNPAY cho thanh toán online tức thì
3. **Tự động xử lý VNPAY qua IPN** — Server-to-server, không phụ thuộc trình duyệt khách hàng
4. **Snapshot sản phẩm trong OrderItem** — Đơn hàng không bị ảnh hưởng khi sản phẩm thay đổi
5. **Quản lý kho an toàn** — Chỉ trừ kho khi đơn hoàn thành, hoàn kho khi hủy hoặc giao thất bại
6. **Bảo mật** — JWT authentication, phân quyền rõ ràng, verify checksum VNPAY

### Hạn chế & Hướng phát triển

| Hạn chế hiện tại | Hướng cải thiện |
|------------------|-----------------|
| Banking chưa tự động xác nhận (cần admin kiểm tra thủ công) | Tích hợp API ngân hàng để tự động đối soát |
| Chưa tích hợp đơn vị vận chuyển (GHN/GHTK) | Tích hợp GHN/GHTK để tự động tạo vận đơn & track shipping |
| Phí ship cố định (30K / miễn phí) | Tính phí ship theo cân nặng / khoảng cách |
| Chưa có mã giảm giá / voucher | Thêm bảng voucher, tính discountAmount |
| Banking QR code sử dụng app ngân hàng thủ công | Hỗ trợ thanh toán tự động qua QR động (NAPAS) |

---

*Bài thuyết trình được soạn dựa trên source code thực tế của dự án ProFit.*
*Các file tham khảo:*
- *Frontend: `CartPage.jsx`, `CheckoutPage.jsx`, `BankingQRPage.jsx`, `api.js`*
- *Backend: `OrderController.java`, `BankingPaymentController.java`, `VNPayController.java`, `OrderServiceImpl.java`*
- *Entity: `Order.java`, `OrderItem.java`*
