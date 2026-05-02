# 📋 SCOPE OF WORK (Phân Chia Công Việc Theo Giai Đoạn)

Để tối ưu thời gian, các thành viên sẽ **không ngồi chơi chờ đợi**. Những ai phụ thuộc dữ liệu của người khác sẽ chia công việc làm 2 giai đoạn: **Giai đoạn 1** (Làm trước các phần độc lập) và **Giai đoạn 2** (Tích hợp sau khi nhận được Output từ người khác).

---

## 👨‍💻 Thành viên 1 (BE): Public APIs (Danh mục & Sản phẩm)
**Thời gian:** Làm ngay từ đầu.
* **Mục tiêu:** Cung cấp API hiển thị sản phẩm và danh mục.
* **Chi tiết thực thi:**
  1. Xây dựng `PublicProductController` và `PublicCategoryController`.
  2. Viết Query tìm kiếm, lọc theo Category, phân trang.
  3. Mở quyền Security (permitAll) cho `/api/public/**`.
* **📤 Đầu ra Bàn giao:** Link API và file Test (Postman) -> **Bàn giao cho Thành viên 3.**

---

## 👨‍💻 Thành viên 2 (BE): Protected APIs (Đặt hàng & Profile)
**Thời gian:** Làm ngay từ đầu.
* **Mục tiêu:** Xử lý logic tạo đơn hàng, lưu DB và thông tin User.
* **Chi tiết thực thi:**
  1. Viết API `POST /api/orders/create` (tính tổng tiền, lưu DB).
  2. Viết API `GET /api/orders/my-orders` để lấy lịch sử đơn hàng.
  3. Viết API lấy và cập nhật thông tin User (`PUT /api/users/profile`).
* **📤 Đầu ra Bàn giao:** Link API (yêu cầu gửi kèm Token) và cấu trúc JSON -> **Bàn giao cho Thành viên 4.**

---

## 👨‍💻 Thành viên 3 (FE): Catalog & Giỏ Hàng (Cart)
**Mục tiêu:** Quản lý giỏ hàng và hiển thị sản phẩm thực tế từ DB.

* **⏳ Giai đoạn 1 (Thực hiện ngay, KHÔNG cần chờ API):**
  1. **Nâng cấp Giỏ hàng (Cart):** Tách state `cart` ở `App.jsx` ra, viết logic lưu giỏ hàng vào `localStorage` (để F5 không mất hàng). Xử lý mượt mà các nút tăng/giảm/xoá sản phẩm trong giỏ.
  2. **Chuẩn bị UI chờ Data:** Vào các trang Sản phẩm, thêm các hiệu ứng Loading (hoặc Skeleton) mượt mà trong lúc chờ load dữ liệu.

* **🚀 Giai đoạn 2 (Sau khi Thành viên 1 bàn giao API):**
  1. Xoá bỏ việc dùng dữ liệu giả từ file `products.js`.
  2. Viết hàm `fetch`/`axios` gọi tới URL API của **Thành viên 1**.
  3. Đổ dữ liệu thật lên Trang Chủ, Trang Danh Sách, Trang Chi Tiết.
  4. **📤 Bàn giao:** Báo cho Thành viên 4 biết Giỏ hàng trong `localStorage` đã sẵn sàng để lấy ra thanh toán.

---

## 👨‍💻 Thành viên 4 (FE): Đặt hàng (Checkout) & Trang Cá nhân
**Mục tiêu:** Hoàn thiện form thanh toán, đẩy data lên BE và làm trang Profile.

* **⏳ Giai đoạn 1 (Thực hiện ngay, KHÔNG cần chờ AI):**
  1. **Làm Form Thanh Toán (`CheckoutPage`):** Căn chỉnh lại UI, viết logic bắt lỗi (Validate) bắt buộc khách phải nhập đúng SĐT, Email, Địa chỉ trước khi bấm nút "Đặt Hàng".
  2. **Trang Profile:** Vẽ giao diện Form cập nhật thông tin cá nhân. Bắt sự kiện người dùng bấm "Lưu".
  3. **Trang Lịch sử:** Xây dựng khung HTML/CSS (UI) cho trang lịch sử đơn hàng (`OrderPage` & `OrderDetailPage`).

* **🚀 Giai đoạn 2 (Sau khi nhận Bàn giao từ TM2 và TM3):**
  1. Nhận Giỏ hàng từ **Thành viên 3**: Trong trang Checkout, dùng hàm đọc giỏ hàng từ `localStorage` để tính tổng tiền hiển thị.
  2. Nhận API từ **Thành viên 2**: 
     - Khi bấm nút "Đặt Hàng", gom data từ form + mảng giỏ hàng gửi lên API tạo đơn của TM2. Đặt thành công thì xoá sạch giỏ hàng.
     - Gọi API Lịch sử đơn hàng của TM2 để đổ dữ liệu thật vào giao diện `OrderPage`.
     - Gọi API Profile để cập nhật thông tin cá nhân.
