# =====================================================
# NỘI DUNG CẦN THÊM VÀO BAO CAO - Ngay 15/05/2026
# =====================================================

## PHẦN CẬP NHẬT: Issue #3 - Lưu Đơn hàng & Đồng bộ Tồn kho (INVENTORY)

### 1. Mô tả Issue
- Giỏ hàng hiện tại chỉ nằm ở trình duyệt (local)
- Khi người dùng bấm Đặt hàng, dữ liệu đã được đẩy xuống DB
- Đã xử lý nghiệp vụ trừ số lượng tồn kho để tránh tình trạng bán khối

### 2. Các thay đổi Backend

#### A. OrderServiceImpl.java
- Thêm annotation @Transactional cho các method tạo/cập nhật đơn hàng
- Thêm logic kiểm tra và trừ tồn kho khi tạo đơn hàng (createOrder và createGuestOrder):
  ```java
  // Kiểm tra đủ hàng không
  if (product.getStockQuantity() < itemReq.getQuantity()) {
      throw new IllegalArgumentException("Sản phẩm '" + product.getName() + "' chỉ còn...");
  }
  // Trừ stock
  product.setStockQuantity(product.getStockQuantity() - itemReq.getQuantity());
  productRepository.save(product);
  ```
- Thêm logic hoàn tồn kho khi hủy đơn (CANCELLED):
  ```java
  if ("CANCELLED".equals(request.getStatus()) && !"CANCELLED".equals(oldStatus)) {
      for (OrderItem item : order.getItems()) {
          product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
          productRepository.save(product);
      }
  }
  ```

#### B. OrderController.java - Thêm endpoints mới
- `GET /api/orders/{id}` - Lấy chi tiết đơn hàng
- `PUT /api/orders/{id}/cancel` - User hủy đơn
- `PUT /api/orders/{id}/status` - Admin cập nhật trạng thái đơn hàng

### 3. Các thay đổi Frontend

#### A. utils/api.js - Thêm API functions
- `apiGetOrderById(orderId)` - Lấy đơn hàng theo ID
- `apiCancelOrder(orderId)` - Hủy đơn hàng (User)

#### B. OrderPage.jsx - Cải tiến
- Thêm nút "Hủy đơn" cho đơn hàng ở trạng thái PENDING
- Thêm dialog xác nhận hủy đơn với giao diện đẹp
- Toast thông báo khi hủy thành công
- Filter đơn hàng theo trạng thái (Tất cả, Chờ xác nhận, Đã xác nhận, Đang giao, Đã nhận, Đã hủy)
- Hiển thị tổng số đơn hàng

### 4. Luồng hoạt động

1. **User đặt hàng** → Tồn kho tự động trừ
2. **User bấm "Hủy đơn"** (trạng thái PENDING) → Dialog xác nhận → Tồn kho tự động hoàn lại
3. **Admin hủy đơn** → Tồn kho tự động hoàn lại

### 5. Test data đã tạo
- 10 đơn hàng PENDING (ORD-PEND001 ~ ORD-PEND010)
- 1 đơn CONFIRMED (ORD-TEST001)
- 1 đơn SHIPPING (ORD-TEST002)
- 1 đơn DELIVERED (ORD-TEST003)
- 1 đơn CANCELLED (ORD-TEST004)

### 6. Tóm tắt Files đã tạo/sửa
| STT | File | Mô tả |
|-----|------|--------|
| 1 | OrderServiceImpl.java | Thêm logic tồn kho |
| 2 | OrderController.java | Thêm endpoints cancel/status |
| 3 | api.js | Thêm apiCancelOrder, apiGetOrderById |
| 4 | OrderPage.jsx | Thêm nút Hủy + dialog xác nhận |
| 5 | App.jsx | Truyền showToast xuống OrderPage |

### 7. Trạng thái hoàn thành
- [x] Backend: Lưu đơn hàng vào DB - HOÀN THÀNH
- [x] Backend: Trừ tồn kho khi đặt hàng - HOÀN THÀNH
- [x] Backend: Hoàn tồn kho khi hủy đơn - HOÀN THÀNH
- [x] Frontend: Nút Hủy đơn với dialog xác nhận - HOÀN THÀNH
- [x] Frontend: Filter đơn hàng theo trạng thái - HOÀN THÀNH
- [x] Test: Tạo data mẫu - HOÀN THÀNH

---

## PHẦN CẬP NHẬT: Issue #3.1 - Đơn giản hóa quy trình xác nhận đơn hàng

### 1. Mô tả thay đổi
- Đơn giản hóa luồng trạng thái đơn hàng cho admin
- Thay vì: PENDING → PAID → PROCESSING → SHIPPED → COMPLETED
- Thành: PENDING → CONFIRMED → SHIPPED → COMPLETED

### 2. Thay đổi Backend
- Không cần thay đổi code backend (đã dùng status động từ request)

### 3. Thay đổi Frontend

#### A. Admin - OrderManagePage.jsx
- Loại bỏ: `PAID`, `PROCESSING`, `REFUNDED` khỏi STATUS_LIST
- Thêm: `CONFIRMED` vào danh sách trạng thái
- Cập nhật STATUS_NEXT:
  ```
  PENDING → CONFIRMED → SHIPPED → COMPLETED
  ```
- Cập nhật STATUS_COLOR:
  ```
  PENDING: "#f59e0b"
  CONFIRMED: "#3b82f6"
  SHIPPED: "#8b5cf6"
  ```

#### B. User - OrderPage.jsx
- Thêm **thông báo xác nhận** hiển thị khi đơn ở trạng thái "Đã xác nhận":
  > ✅ **Admin đã xác nhận!** Bạn sẽ chờ trong **3-5 ngày** để nhận hàng.
- Cập nhật STATUS_LABEL:
  ```
  PENDING: "Chờ xác nhận"
  CONFIRMED: "Đã xác nhận"
  SHIPPED: "Đang giao"
  COMPLETED: "Hoàn tất"
  CANCELLED: "Đã hủy"
  ```
- Cập nhật filter tabs: "Đang giao" thay vì "Đang vận chuyển"

### 4. Luồng hoạt động mới

1. **Admin xác nhận đơn** (PENDING → CONFIRMED) → User thấy thông báo "Admin đã xác nhận, bạn sẽ chờ trong 3-5 ngày"
2. **Admin chuyển giao hàng** (CONFIRMED → SHIPPED)
3. **Admin hoàn tất** (SHIPPED → COMPLETED)

### 5. Tóm tắt Files đã sửa
| STT | File | Mô tả |
|-----|------|--------|
| 1 | OrderManagePage.jsx | Đơn giản hóa luồng trạng thái admin |
| 2 | OrderPage.jsx | Thêm thông báo xác nhận cho user |

### 6. Trạng thái hoàn thành
- [x] Backend: Không cần thay đổi - HOÀN THÀNH
- [x] Frontend: Đơn giản hóa admin - HOÀN THÀNH
- [x] Frontend: Thêm thông báo user - HOÀN THÀNH

---

## PHẦN CẬP NHẬT: Issue #3.2 - Thêm nút "Quay lại" cho các trang Admin

### 1. Mô tả
- Thêm nút "← Quay lại" ở header các trang admin để người dùng có thể quay về Dashboard

### 2. Thay đổi Files

#### A. App.jsx
- Truyền `navigate` props xuống OrderManagePage và ProductManagePage

#### B. OrderManagePage.jsx
- Thêm prop `navigate`
- Thêm button "← Quay lại" ở header, quay về `admin-dashboard`

#### C. ProductManagePage.jsx
- Thêm prop `navigate`
- Thêm button "← Quay lại" ở header, quay về `admin-dashboard`

#### D. UserManagePage.jsx
- Đã có sẵn nút "← Quay lại" (không cần thay đổi)

### 3. Tóm tắt Files đã sửa
| STT | File | Mô tả |
|-----|------|--------|
| 1 | App.jsx | Truyền navigate props |
| 2 | OrderManagePage.jsx | Thêm nút Quay lại |
| 3 | ProductManagePage.jsx | Thêm nút Quay lại |

### 4. Trạng thái hoàn thành
- [x] OrderManagePage - HOÀN THÀNH
- [x] ProductManagePage - HOÀN THÀNH
- [x] UserManagePage - Đã có sẵn

---

## PHẦN CẬP NHẬT: Issue #3.3 - Cải thiện hiển thị trạng thái & Reload đơn hàng

### 1. Mô tả
- Đảm bảo tab "Đã xác nhận" hiển thị màu xanh khi active
- Đơn hàng đã xác nhận hiển thị trong lịch sử đơn hàng bên user
- Force reload OrderPage khi user quay lại từ admin

### 2. Thay đổi Files

#### A. OrderManagePage.jsx
- Thêm `color` vào STATUS_LIST để hiển thị màu theo trạng thái
- CONFIRMED: màu xanh `#22c55e`
- Tab active hiển thị màu nền và border theo trạng thái

#### B. OrderPage.jsx (User)
- Đổi màu CONFIRMED từ `#3b82f6` sang `#22c55e` (xanh lá)
- Đơn hàng CONFIRMED hiển thị thông báo: "Admin đã xác nhận! Bạn sẽ chờ trong 3-5 ngày"

#### C. App.jsx
- Thêm `key="orders-page"` vào OrderPage để force remount khi navigate
- Khi user quay từ admin về, OrderPage sẽ fetch lại data từ backend

### 3. Luồng hoạt động
1. Admin xác nhận đơn (PENDING → CONFIRMED)
2. Admin click "Quay lại Dashboard"
3. User click "Đơn hàng của tôi"
4. OrderPage force remount → fetch API → hiển thị đơn CONFIRMED với thông báo

### 4. Tóm tắt Files đã sửa
| STT | File | Mô tả |
|-----|------|--------|
| 1 | OrderManagePage.jsx | Màu tab theo trạng thái |
| 2 | OrderPage.jsx | Màu xanh CONFIRMED |
| 3 | App.jsx | Force remount OrderPage |

### 5. Trạng thái hoàn thành
- [x] Hiển thị màu xanh cho "Đã xác nhận" - HOÀN THÀNH
- [x] Reload đơn hàng khi quay lại - HOÀN THÀNH
- [x] Thông báo "Admin đã xác nhận" - HOÀN THÀNH

---
Ngày cập nhật: 16/05/2026 - 11:19
