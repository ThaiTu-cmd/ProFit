// =====================================================
// pages/CheckoutPage.jsx – Trang thanh toán
// Props: cart, onPlaceOrder, navigate
// Tự động lấy thông tin user đã lưu để không phải nhập lại
// =====================================================

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "../data/products";

const DEFAULT_USER_INFO = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  district: "",
  city: "",
  note: "",
};

const COUPONS = {
  POWERFUEL30: 0.3,
  SALE10: 0.1,
};

const CheckoutPage = ({ cart = [], onPlaceOrder, navigate }) => {
  const [userInfo, setUserInfo] = useState(DEFAULT_USER_INFO);
  const [payMethod, setPayMethod] = useState("cod");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("userInfo");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserInfo({
          ...DEFAULT_USER_INFO,
          ...parsed,
        });
      }
    } catch (error) {
      console.error("Không đọc được thông tin người dùng đã lưu:", error);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const hasRequiredInfo = useMemo(() => {
    return (
      userInfo.fullName?.trim() &&
      userInfo.phone?.trim() &&
      userInfo.address?.trim() &&
      userInfo.city?.trim()
    );
  }, [userInfo]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }, [cart]);

  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = Math.max(0, subtotal + shipping - discount);

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    const pct = COUPONS[code];

    if (!code) {
      setDiscount(0);
      setCouponMsg("❌ Vui lòng nhập mã giảm giá");
      return;
    }

    if (pct) {
      const discountValue = Math.round(subtotal * pct);
      setDiscount(discountValue);
      setCouponMsg(`✅ Áp dụng thành công – giảm ${pct * 100}%`);
    } else {
      setDiscount(0);
      setCouponMsg("❌ Mã không hợp lệ");
    }
  };

  const handlePlaceOrder = () => {
    if (!hasRequiredInfo) {
      alert("Bạn chưa lưu đủ thông tin giao hàng. Vui lòng cập nhật hồ sơ trước khi đặt hàng.");
      navigate("profile");
      return;
    }

    const order = {
      id: Date.now(),
      items: cart,
      info: userInfo,
      payMethod,
      subtotal,
      shipping,
      discount,
      total,
      status: "pending",
      createdAt: new Date().toLocaleDateString("vi-VN"),
    };

    onPlaceOrder(order);
    navigate("order-success");
  };

  if (cart.length === 0) {
    return (
      <div className="section">
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <h3>Giỏ hàng trống</h3>
          <p>Vui lòng thêm sản phẩm trước khi thanh toán.</p>
          <button className="btn-primary" onClick={() => navigate("products")}>
            Mua sắm ngay
          </button>
        </div>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="section">
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h3>Đang tải thông tin giao hàng...</h3>
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
                      {[userInfo.address, userInfo.district, userInfo.city]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>

                  <div className="summary-row" style={{ alignItems: "flex-start" }}>
                    <span>Ghi chú</span>
                    <span style={{ textAlign: "right", maxWidth: "60%" }}>
                      {userInfo.note || "Không có"}
                    </span>
                  </div>

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

            <div className="checkout-card">
              <h3 className="checkout-card-title">💳 Phương thức thanh toán</h3>

              <div className="pay-methods">
                {[
                  { id: "cod", icon: "💵", label: "Thanh toán khi nhận hàng (COD)" },
                  { id: "banking", icon: "🏦", label: "Chuyển khoản ngân hàng" },
                  { id: "vnpay", icon: "📱", label: "VNPay / Ví điện tử" },
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
          </div>

          {/* Cột phải */}
          <div className="cart-summary">
            <h3 className="summary-title">Đơn hàng của bạn</h3>

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
                    <span style={{ fontSize: 28 }}>{item.product.emoji}</span>
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

            <div className="coupon-wrap" style={{ marginBottom: 8 }}>
              <input
                type="text"
                className="search-input"
                placeholder="Mã giảm giá..."
                style={{ flex: 1 }}
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <button
                className="btn-primary"
                style={{ whiteSpace: "nowrap", padding: "10px 14px" }}
                onClick={applyCoupon}
              >
                Áp dụng
              </button>
            </div>

            {couponMsg && (
              <div
                style={{
                  fontSize: 12,
                  marginBottom: 12,
                  color: discount > 0 ? "var(--green)" : "var(--red)",
                }}
              >
                {couponMsg}
              </div>
            )}

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

            {discount > 0 && (
              <div className="summary-row">
                <span>Giảm giá</span>
                <span style={{ color: "var(--green)" }}>
                  - {formatPrice(discount)}
                </span>
              </div>
            )}

            <div className="summary-divider"></div>

            <div className="summary-row summary-total">
              <span>Tổng cộng</span>
              <span>{formatPrice(total)}</span>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", padding: "16px 0", marginTop: 20, fontSize: 16 }}
              onClick={handlePlaceOrder}
              disabled={!hasRequiredInfo}
            >
              Đặt hàng ngay →
            </button>

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