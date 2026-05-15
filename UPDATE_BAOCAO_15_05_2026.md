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
Ngày cập nhật: 15/05/2026 - 23:17
Người thực hiện: Thành viên 2 (Backend & Frontend)
