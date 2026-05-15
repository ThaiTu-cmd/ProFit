// =====================================================
// pages/CheckoutPage.jsx – Trang thanh toán
// Props: cart, user, onPlaceOrder, navigate, showToast
// =====================================================

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "../data/products";
import { ShoppingCart, Loader2, Banknote, Landmark, Smartphone, AlertCircle } from "lucide-react";
import { apiCreateOrder, apiCreateGuestOrder, isLoggedIn } from "../utils/api";

const DEFAULT_USER_INFO = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  district: "",
  city: "",
  province: "",
  note: "",
};

const CheckoutPage = ({ cart = [], user, onPlaceOrder, navigate, showToast }) => {
  const [userInfo, setUserInfo] = useState(DEFAULT_USER_INFO);
  const [payMethod, setPayMethod] = useState("cod");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState(null);

  // Load user info từ localStorage khi mount
  useEffect(() => {
    try {
      const storageKey = user ? `userInfo_${user.email}` : "userInfo";
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserInfo({
          ...DEFAULT_USER_INFO,
          ...parsed,
        });
      } else if (user) {
        setUserInfo({
          ...DEFAULT_USER_INFO,
          fullName: user.name || "",
          email: user.email || "",
          phone: user.phone || ""
        });
      }
    } catch (error) {
      console.error("Không đọc được thông tin người dùng đã lưu:", error);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  // Kiểm tra thông tin bắt buộc
  const hasRequiredInfo = useMemo(() => {
    return (
      userInfo.fullName?.trim() &&
      userInfo.phone?.trim() &&
      userInfo.address?.trim() &&
      userInfo.city?.trim()
    );
  }, [userInfo]);

  // Tính tổng tiền
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }, [cart]);

  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shipping;

  // Xử lý đặt hàng
  const handlePlaceOrder = async () => {
    // Validate thông tin
    if (!hasRequiredInfo) {
      showToast("Bạn chưa lưu đủ thông tin giao hàng!");
      navigate("profile");
      return;
    }

    if (cart.length === 0) {
      showToast("Giỏ hàng trống!");
      return;
    }

    setPlacing(true);
    setOrderError(null);

    try {
      // Nếu đã đăng nhập -> gọi API tạo đơn ở BE
      if (isLoggedIn()) {
        const orderData = {
          recipientName: userInfo.fullName,
          recipientPhone: userInfo.phone,
          shippingAddressLine1: `${userInfo.address}${userInfo.district ? ', ' + userInfo.district : ''}`,
          shippingCity: userInfo.city,
          shippingProvince: userInfo.province || userInfo.city,
          note: userInfo.note || "",
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.qty,
          })),
        };

        const result = await apiCreateOrder(orderData);

        // Lưu order vào local orders (để hiển thị trong OrderPage)
        const localOrder = {
          ...result,
          localCreated: true,
          placedAt: new Date().toISOString(),
        };
        const savedLocal = localStorage.getItem("localOrders");
        const localOrders = savedLocal ? JSON.parse(savedLocal) : [];
        localOrders.push(localOrder);
        localStorage.setItem("localOrders", JSON.stringify(localOrders));

        showToast("Đặt hàng thành công!");
        onPlaceOrder(localOrder);
        navigate("order-success");

      } else {
        // Guest checkout - gọi API không cần đăng nhập
        const guestOrderData = {
          recipientName: userInfo.fullName,
          recipientPhone: userInfo.phone,
          shippingAddressLine1: `${userInfo.address}${userInfo.district ? ', ' + userInfo.district : ''}`,
          shippingCity: userInfo.city,
          shippingProvince: userInfo.province || userInfo.city,
          note: userInfo.note || "",
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.qty,
          })),
        };

        const result = await apiCreateGuestOrder(guestOrderData);

        const localOrder = {
          ...result,
          localCreated: true,
          placedAt: new Date().toISOString(),
          guestOrder: true,
        };

        const savedLocal = localStorage.getItem("localOrders");
        const localOrders = savedLocal ? JSON.parse(savedLocal) : [];
        localOrders.push(localOrder);
        localStorage.setItem("localOrders", JSON.stringify(localOrders));

        showToast("Đặt hàng thành công! Cảm ơn bạn đã mua sắm.");
        onPlaceOrder(localOrder);
        navigate("order-success");
      }

    } catch (err) {
      console.error("Lỗi khi đặt hàng:", err);
      setOrderError(err.message || "Đặt hàng thất bại. Vui lòng thử lại.");
      showToast("Đặt hàng thất bại!");
    } finally {
      setPlacing(false);
    }
  };

  // Giỏ hàng trống
  if (cart.length === 0) {
    return (
      <div className="section">
        <div className="empty-state">
          <div className="empty-icon"><ShoppingCart size={64} color="var(--gray)" /></div>
          <h3>Giỏ hàng trống</h3>
          <p>Vui lòng thêm sản phẩm trước khi thanh toán.</p>
          <button className="btn-primary" onClick={() => navigate("products")}>
            Mua sắm ngay
          </button>
        </div>
      </div>
    );
  }

  // Loading profile
  if (loadingProfile) {
    return (
      <div className="section">
        <div className="empty-state">
          <Loader2 size={48} color="var(--primary)" className="spinning" />
          <h2 style={{ marginBottom: 10 }}>Đang tải...</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-hero">
        <h1>
          THANH <span>TOÁN</span>
        </h1>
        <p>Xác nhận thông tin đã lưu và chọn phương thức thanh toán</p>
      </div>

      <section className="section">
        <div className="checkout-layout">
          {/* Cột trái */}
          <div className="checkout-form-col">
            {/* Thông tin giao hàng */}
            <div className="checkout-card">
              <h3 className="checkout-card-title">📦 Thông tin giao hàng</h3>

              {hasRequiredInfo ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="summary-row">
                    <span>Họ và tên</span>
                    <span>{userInfo.fullName}</span>
                  </div>

                  <div className="summary-row">
                    <span>Số điện thoại</span>
                    <span>{userInfo.phone}</span>
                  </div>

                  <div className="summary-row">
                    <span>Email</span>
                    <span>{userInfo.email || "Chưa cập nhật"}</span>
                  </div>

                  <div className="summary-row" style={{ alignItems: "flex-start" }}>
                    <span>Địa chỉ</span>
                    <span style={{ textAlign: "right", maxWidth: "60%" }}>
                      {[userInfo.address, userInfo.district, userInfo.city, userInfo.province]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>

                  {userInfo.note && (
                    <div className="summary-row" style={{ alignItems: "flex-start" }}>
                      <span>Ghi chú</span>
                      <span style={{ textAlign: "right", maxWidth: "60%" }}>
                        {userInfo.note}
                      </span>
                    </div>
                  )}

                  {!isLoggedIn() && (
                    <div style={{
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px solid #f59e0b",
                      borderRadius: 8,
                      padding: "12px",
                      marginTop: 8,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f59e0b", marginBottom: 8 }}>
                        <AlertCircle size={18} />
                        <strong>Lưu ý</strong>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--gray)", margin: 0 }}>
                        Bạn chưa đăng nhập. Đơn hàng sẽ được lưu tạm thời.{" "}
                        <span
                          style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}
                          onClick={() => navigate("login")}
                        >
                          Đăng nhập ngay
                        </span>{" "}
                        để quản lý đơn hàng tốt hơn.
                      </p>
                    </div>
                  )}

                  <button
                    className="btn-outline"
                    style={{ marginTop: 12 }}
                    onClick={() => navigate("profile")}
                  >
                    Chỉnh sửa thông tin
                  </button>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "20px 0" }}>
                  <div className="empty-icon">👤</div>
                  <h3>Chưa có thông tin giao hàng</h3>
                  <p>Vui lòng lưu thông tin cá nhân để đặt hàng nhanh hơn.</p>
                  <button className="btn-primary" onClick={() => navigate("profile")}>
                    Cập nhật thông tin
                  </button>
                </div>
              )}
            </div>

            {/* Phương thức thanh toán */}
            <div className="checkout-card">
              <h3 className="checkout-card-title">💳 Phương thức thanh toán</h3>

              <div className="pay-methods">
                {[
                  { id: "cod", icon: <Banknote size={24} />, label: "Thanh toán khi nhận hàng (COD)" },
                  { id: "banking", icon: <Landmark size={24} />, label: "Chuyển khoản ngân hàng" },
                  { id: "vnpay", icon: <Smartphone size={24} />, label: "VNPay / Ví điện tử" },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`pay-option ${payMethod === m.id ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="pay"
                      value={m.id}
                      checked={payMethod === m.id}
                      onChange={() => setPayMethod(m.id)}
                      style={{ display: "none" }}
                    />
                    <span className="pay-icon">{m.icon}</span>
                    <span className="pay-label">{m.label}</span>
                    {payMethod === m.id && (
                      <span style={{ marginLeft: "auto", color: "var(--green)" }}>✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Error message */}
            {orderError && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--red)",
                borderRadius: 8,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--red)",
              }}>
                <AlertCircle size={18} />
                <span>{orderError}</span>
              </div>
            )}
          </div>

          {/* Cột phải - Tóm tắt đơn hàng */}
          <div className="cart-summary">
            <h3 className="summary-title">Đơn hàng của bạn</h3>

            {/* Danh sách sản phẩm */}
            <div style={{ marginBottom: 16 }}>
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 28 }}>{item.product.emoji || "🏋️"}</span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--white)",
                        }}
                      >
                        {item.product.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--gray)" }}>
                        x{item.qty}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--primary)",
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 18,
                    }}
                  >
                    {formatPrice(item.product.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-divider"></div>

            {/* Tính tiền */}
            <div className="summary-row">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span style={{ color: shipping === 0 ? "var(--green)" : "inherit" }}>
                {shipping === 0 ? "Miễn phí" : formatPrice(shipping)}
              </span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row summary-total">
              <span>Tổng cộng</span>
              <span>{formatPrice(total)}</span>
            </div>

            {/* Nút đặt hàng */}
            <button
              className="btn-primary"
              style={{ width: "100%", padding: "16px 0", marginTop: 20, fontSize: 16 }}
              onClick={handlePlaceOrder}
              disabled={!hasRequiredInfo || placing}
            >
              {placing ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 size={18} className="spinning" />
                  Đang xử lý...
                </span>
              ) : (
                "Đặt hàng ngay →"
              )}
            </button>

            {placing && (
              <p style={{ textAlign: "center", fontSize: 12, color: "var(--gray)", marginTop: 8 }}>
                Vui lòng chờ, không tắt trình duyệt...
              </p>
            )}

            <button
              className="btn-outline"
              style={{ width: "100%", padding: "12px 0", marginTop: 10 }}
              onClick={() => navigate("cart")}
            >
              ← Quay lại giỏ hàng
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CheckoutPage;
