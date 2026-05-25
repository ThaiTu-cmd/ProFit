// =====================================================
// pages/CheckoutPage.jsx – Thanh toán Premium
// =====================================================

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "../utils/productHelpers";
import { ShoppingCart, Loader2, Banknote, Landmark, Smartphone, AlertCircle } from "lucide-react";
import { apiCreateOrder, apiCreateGuestOrder, apiCreatePayment, isLoggedIn } from "../utils/api";

const DEFAULT_USER_INFO = {
  fullName: "", phone: "", email: "", address: "", district: "", city: "", province: "", note: "",
};

const CheckoutPage = ({ cart = [], user, onPlaceOrder, navigate, showToast }) => {
  const [userInfo, setUserInfo] = useState(DEFAULT_USER_INFO);
  const [payMethod, setPayMethod] = useState("cod");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState(null);

  useEffect(() => {
    try {
      const storageKey = user ? `userInfo_${user.email}` : "userInfo";
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserInfo({ ...DEFAULT_USER_INFO, ...parsed });
      } else if (user) {
        setUserInfo({
          ...DEFAULT_USER_INFO,
          fullName: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      }
    } catch { /* ignore */ }
    setLoadingProfile(false);
  }, [user]);

  const hasRequiredInfo = useMemo(() => {
    return (
      userInfo.fullName?.trim() &&
      userInfo.phone?.trim() &&
      userInfo.address?.trim() &&
      userInfo.city?.trim()
    );
  }, [userInfo]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.qty, 0), [cart]);
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shipping;

  const handlePlaceOrder = async () => {
    if (!hasRequiredInfo) {
      showToast("Bạn chưa lưu đủ thông tin giao hàng!");
      navigate("profile");
      return;
    }
    if (cart.length === 0) { showToast("Giỏ hàng trống!"); return; }

    setPlacing(true);
    setOrderError(null);

    const buildOrderData = () => ({
      recipientName: userInfo.fullName,
      recipientPhone: userInfo.phone,
      shippingAddressLine1: `${userInfo.address}${userInfo.district ? ", " + userInfo.district : ""}`,
      shippingCity: userInfo.city,
      shippingProvince: userInfo.province || userInfo.city,
      note: userInfo.note || "",
      items: cart.map((item) => ({ productId: item.product.id, quantity: item.qty })),
    });

    try {
      const result = isLoggedIn()
        ? await apiCreateOrder(buildOrderData())
        : await apiCreateGuestOrder(buildOrderData());

      // LUÔN sử dụng total từ FE (đã bao gồm subtotal + shipping)
      // KHÔNG dùng result.totalAmount vì backend chỉ tính subtotal
      const orderForStorage = {
        ...result,
        total: total, // FE tính: subtotal + shipping
        subtotal,
        shipping,
        discount: 0,
        info: userInfo,
        payMethod,
        placedAt: new Date().toISOString(),
        guestOrder: !isLoggedIn(),
      };

      const savedLocal = localStorage.getItem("localOrders");
      const localOrders = savedLocal ? JSON.parse(savedLocal) : [];
      localOrders.push(orderForStorage);
      localStorage.setItem("localOrders", JSON.stringify(localOrders));

      // Banking: hiện màn hình QR code
      if (payMethod === "banking") {
        showToast("Đang chuyển đến trang thanh toán...");
        // Lưu order để hiển thị QR
        localStorage.setItem("pendingBankingOrder", JSON.stringify(orderForStorage));
        // KHÔNG gọi onPlaceOrder ở đây vì chưa thanh toán thành công
        // Giỏ hàng sẽ được xóa KHI nút "Đã thanh toán" được nhấn trên BankingQRPage
        navigate("banking-qr");
        return;
      }

      // VNPay: lấy payment URL và redirect
      if (payMethod === "vnpay") {
        showToast("Đang chuyển sang VNPay...");
        try {
          const { paymentUrl } = await apiCreatePayment(result.id);
          // Lưu order đang chờ thanh toán để reload sau khi quay về
          localStorage.setItem("pendingVnpayOrder", JSON.stringify(orderForStorage));
          window.location.href = paymentUrl;
          return;
        } catch (vnpayErr) {
          // Nếu không lấy được URL, vẫn hiển thị thành công nhưng cảnh báo
          showToast("Tạo đơn thành công nhưng không thể kết nối VNPay. Vui lòng thanh toán sau.");
        }
      }

      showToast(isLoggedIn() ? "Đặt hàng thành công!" : "Đặt hàng thành công! Cảm ơn bạn.");
      onPlaceOrder(orderForStorage);
      navigate("order-success");
    } catch (err) {
      console.error("Lỗi khi đặt hàng:", err);
      setOrderError(err.message || "Đặt hàng thất bại. Vui lòng thử lại.");
      showToast("Đặt hàng thất bại!");
    } finally {
      setPlacing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="section">
        <div className="empty-state">
          <div className="empty-icon"><ShoppingCart size={72} color="var(--primary)" /></div>
          <h3>Giỏ hàng trống</h3>
          <p>Vui lòng thêm sản phẩm trước khi thanh toán.</p>
          <button className="btn-primary" onClick={() => navigate("products")}>Mua sắm ngay</button>
        </div>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="section">
        <div className="empty-state">
          <Loader2 size={48} color="var(--primary)" className="spinning" style={{ margin: "0 auto 12px", display: "block" }} />
          <h2>Đang tải...</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-hero">
        <h1>THANH <span>TOÁN</span></h1>
        <p>Xác nhận thông tin & chọn phương thức thanh toán</p>
      </div>

      <section className="section">
        <div className="checkout-layout">
          {/* Cột trái */}
          <div className="checkout-form-col">
            {/* Thông tin giao hàng */}
            <div className="checkout-card">
              <h3 className="checkout-card-title">📦 Thông tin giao hàng</h3>

              {hasRequiredInfo ? (
                <div>
                  {[
                    { label: "Họ và tên", value: userInfo.fullName },
                    { label: "Số điện thoại", value: userInfo.phone },
                    { label: "Email", value: userInfo.email || "Chưa cập nhật" },
                    { label: "Địa chỉ", value: [userInfo.address, userInfo.district, userInfo.city, userInfo.province].filter(Boolean).join(", ") },
                    ...(userInfo.note ? [{ label: "Ghi chú", value: userInfo.note }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="summary-row" style={{ borderBottom: "1px solid rgba(255,92,0,0.05)", paddingBottom: 12, marginBottom: 12 }}>
                      <span style={{ color: "var(--gray)", fontSize: 13 }}>{label}</span>
                      <span style={{ color: "var(--white)", fontWeight: 600, maxWidth: "60%", textAlign: "right" }}>{value}</span>
                    </div>
                  ))}

                  {!isLoggedIn() && (
                    <div style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.2)",
                      borderRadius: "var(--radius-md)",
                      padding: "14px",
                      marginTop: 8,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--amber)", marginBottom: 8, fontWeight: 700, fontSize: 13 }}>
                        <AlertCircle size={16} /> Lưu ý
                      </div>
                      <p style={{ fontSize: 13, color: "var(--gray)", margin: 0, lineHeight: 1.7 }}>
                        Bạn chưa đăng nhập.{" "}
                        <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }} onClick={() => navigate("login")}>
                          Đăng nhập ngay
                        </span>{" "}
                        để quản lý đơn hàng tốt hơn.
                      </p>
                    </div>
                  )}

                  <button className="btn-outline" style={{ marginTop: 16 }} onClick={() => navigate("profile")}>
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
                    <input type="radio" name="pay" value={m.id} checked={payMethod === m.id}
                      onChange={() => setPayMethod(m.id)} style={{ display: "none" }} />
                    <span className="pay-icon">{m.icon}</span>
                    <span className="pay-label">{m.label}</span>
                    {payMethod === m.id && (
                      <span style={{ marginLeft: "auto", color: "var(--green)", fontWeight: 700 }}>✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Error */}
            {orderError && (
              <div style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--red)",
                fontSize: 14,
              }}>
                <AlertCircle size={18} />
                <span>{orderError}</span>
              </div>
            )}
          </div>

          {/* Cột phải - Tóm tắt */}
          <div className="cart-summary">
            <h3 className="summary-title">Đơn hàng của bạn</h3>

            <div style={{ marginBottom: 16 }}>
              {cart.map((item) => (
                <div key={item.product.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 14,
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{
                      background: "rgba(255,92,0,0.06)",
                      borderRadius: "var(--radius-sm)",
                      padding: 6,
                      border: "1px solid rgba(255,92,0,0.08)",
                    }}>
                      <img src={item.product.image} alt={item.product.name}
                        style={{ width: 40, height: 40, objectFit: "contain" }}
                        onError={(e) => { e.target.style.display = "none"; }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>
                        {item.product.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--gray)" }}>x{item.qty}</div>
                    </div>
                  </div>
                  <span style={{
                    fontWeight: 700, color: "var(--primary)",
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 18,
                  }}>
                    {formatPrice(item.product.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-divider" />

            {[
              { label: "Tạm tính", value: formatPrice(subtotal) },
              { label: "Phí vận chuyển", value: shipping === 0 ? "Miễn phí" : formatPrice(shipping), highlight: shipping === 0 },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="summary-row">
                <span>{label}</span>
                <span style={{ color: highlight ? "var(--green)" : "inherit", fontWeight: highlight ? 700 : 400 }}>
                  {value}
                </span>
              </div>
            ))}

            <div className="summary-divider" />

            <div className="summary-row summary-total">
              <span>Tổng cộng</span>
              <span>{formatPrice(total)}</span>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", padding: "16px 0", marginTop: 20, fontSize: 16, boxShadow: "0 4px 20px rgba(255,92,0,0.3)" }}
              onClick={handlePlaceOrder}
              disabled={!hasRequiredInfo || placing}
            >
              {placing ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 size={18} className="spinning" /> Đang xử lý...
                </span>
              ) : "Đặt hàng ngay →"}
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
