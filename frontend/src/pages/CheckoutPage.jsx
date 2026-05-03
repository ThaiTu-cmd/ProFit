// =====================================================
// pages/CheckoutPage.jsx – Trang thanh toán
// Hỗ trợ: Khách vãng lai (nhập thông tin trực tiếp) + Khách có tài khoản
// Kết nối backend thật: đặt hàng, áp mã giảm giá, tra cứu đơn
// =====================================================

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../services/apiConfig";
import { formatPrice } from "../data/products";
import { ShoppingCart, Clock, User, Banknote, Landmark, Smartphone, Search, Package } from "lucide-react";

const ORDER_STATUS_VI = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  REJECTED: "Từ chối",
};

const PAYMENT_STATUS_VI = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thất bại",
};

const CheckoutPage = ({ cart = [], user, onPlaceOrder, navigate, showToast }) => {
  // ── Thông tin giao hàng ──────────────────────────
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [note, setNote] = useState("");

  // ── Thanh toán ───────────────────────────────────
  const [payMethod, setPayMethod] = useState("cod");

  // ── Mã giảm giá ─────────────────────────────────
  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0); // số tiền giảm
  const [couponType, setCouponType] = useState(null);     // PERCENTAGE | AMOUNT
  const [couponValue, setCouponValue] = useState(0);      // % hoặc số tiền
  const [couponMax, setCouponMax] = useState(0);

  // ── Tra cứu đơn (khách vãng lai) ────────────────
  const [lookupMode, setLookupMode] = useState(false);
  const [lookupOrderCode, setLookupOrderCode] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // ── Đặt hàng ────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── Nạp thông tin user đã lưu ───────────────────
  useEffect(() => {
    try {
      if (user) {
        const storageKey = `userInfo_${user.email}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setRecipientName(parsed.fullName || user.name || "");
          setRecipientPhone(parsed.phone || user.phone || "");
          setAddressLine1(parsed.address || "");
          setCity(parsed.city || "");
        } else {
          setRecipientName(user.name || "");
          setRecipientPhone(user.phone || "");
        }
      }
    } catch (e) {
      console.error("Lỗi đọc thông tin user:", e);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  // ── Tính tiền ───────────────────────────────────
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }, [cart]);

  const shipping = subtotal >= 500000 ? 0 : 30000;

  const discountAmount = useMemo(() => {
    if (!couponDiscount || couponDiscount <= 0) return 0;
    if (couponType === "AMOUNT") {
      return Math.min(couponDiscount, subtotal);
    }
    // PERCENTAGE
    let d = Math.round(subtotal * couponValue / 100);
    if (couponMax > 0) d = Math.min(d, couponMax);
    return d;
  }, [couponDiscount, couponType, couponValue, couponMax, subtotal]);

  const total = useMemo(() => {
    return Math.max(0, subtotal + shipping - discountAmount);
  }, [subtotal, shipping, discountAmount]);

  // ── Áp mã giảm giá ───────────────────────────────
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMsg("Vui lòng nhập mã giảm giá");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/guest/coupon/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponType(data.discountType);
        setCouponValue(Number(data.discountValue));
        setCouponDiscount(Number(data.discountValue));
        setCouponMax(data.maxDiscountAmount || 0);
        const typeLabel = data.discountType === "PERCENTAGE" ? `${data.discountValue}%` : formatPrice(data.discountValue);
        setCouponMsg(`Mã hợp lệ - Giảm ${typeLabel}`);
      } else {
        setCouponDiscount(0);
        setCouponType(null);
        setCouponMsg(data.error || "Mã không hợp lệ");
      }
    } catch (e) {
      setCouponMsg("Không thể kiểm tra mã. Thử lại sau.");
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponType(null);
    setCouponValue(0);
    setCouponMax(0);
    setCouponMsg("");
  };

  // ── Kiểm tra form hợp lệ ────────────────────────
  const hasRequiredInfo = useMemo(() => {
    return (
      recipientName.trim() &&
      recipientPhone.trim() &&
      addressLine1.trim() &&
      city.trim()
    );
  }, [recipientName, recipientPhone, addressLine1, city]);

  // ── Đặt hàng ────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast("Giỏ hàng trống");
      return;
    }

    const missing = [];
    if (!recipientName.trim()) missing.push("họ tên");
    if (!recipientPhone.trim()) missing.push("số điện thoại");
    if (!addressLine1.trim()) missing.push("địa chỉ");
    if (!city.trim()) missing.push("tỉnh/thành phố");

    if (missing.length > 0) {
      showToast(`Vui lòng nhập: ${missing.join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        productSku: item.product.sku,
        quantity: item.qty,
      }));

      const payload = {
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        shippingAddressLine1: addressLine1.trim(),
        shippingCity: city.trim(),
        shippingProvince: province.trim() || city.trim(),
        note: note.trim() || null,
        paymentMethod: payMethod,
        discountCode: couponCode.trim() || null,
        items,
      };

      const res = await fetch(`${API_BASE_URL}/guest/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Đặt hàng thất bại");
      }

      // Lưu thông tin giao hàng nếu là khách có tài khoản
      if (user && user.email) {
        const storageKey = `userInfo_${user.email}`;
        localStorage.setItem(storageKey, JSON.stringify({
          fullName: recipientName.trim(),
          phone: recipientPhone.trim(),
          address: addressLine1.trim(),
          city: city.trim(),
          district: "",
          note: note.trim(),
        }));
      }

      setOrderSuccess(data);
      onPlaceOrder(data);
      navigate("order-success");

    } catch (err) {
      showToast(err.message || "Có lỗi xảy ra. Thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Tra cứu đơn (khách vãng lai) ─────────────────
  const handleLookup = async () => {
    if (!lookupOrderCode.trim() || !lookupPhone.trim()) {
      showToast("Nhập mã đơn hàng và số điện thoại");
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/guest/orders/lookup?orderCode=${encodeURIComponent(lookupOrderCode.trim())}&phone=${encodeURIComponent(lookupPhone.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tìm thấy đơn hàng");
      setLookupResult(data);
    } catch (err) {
      setLookupResult({ error: err.message });
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Giỏ trống ────────────────────────────────────
  if (cart.length === 0 && !orderSuccess) {
    return (
      <div>
        <div className="page-hero">
          <h1>THEO DÕI <span>ĐƠN HÀNG</span></h1>
          <p>Tra cứu tình trạng đơn hàng của bạn</p>
        </div>
        <section className="section">
          <div className="checkout-layout">
            <div className="checkout-form-col">
              {/* ── Tra cứu đơn ── */}
              <div className="checkout-card">
                <h3 className="checkout-card-title">Tra cứu đơn hàng</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label className="form-label">Mã đơn hàng</label>
                    <input
                      className="form-input"
                      placeholder="Ví dụ: PF202504271200001234"
                      value={lookupOrderCode}
                      onChange={e => setLookupOrderCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Số điện thoại</label>
                    <input
                      className="form-input"
                      placeholder="Số điện thoại đã đặt hàng"
                      value={lookupPhone}
                      onChange={e => setLookupPhone(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handleLookup}
                    disabled={lookupLoading}
                    style={{ width: "100%" }}
                  >
                    <Search size={16} style={{ marginRight: 6 }} />
                    {lookupLoading ? "Đang tra cứu..." : "Tra cứu"}
                  </button>
                </div>

                {lookupResult && (
                  <div style={{ marginTop: 20 }}>
                    {lookupResult.error ? (
                      <div className="empty-state" style={{ padding: "20px 0" }}>
                        <p style={{ color: "var(--red)" }}>{lookupResult.error}</p>
                      </div>
                    ) : (
                      <div className="checkout-card" style={{ marginTop: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <h4 style={{ color: "var(--primary)", fontFamily: "'Bebas Neue', sans-serif", fontSize: 20 }}>
                            #{lookupResult.orderCode}
                          </h4>
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: 20,
                            background: lookupResult.status === "DELIVERED" ? "var(--green)" : "var(--primary)",
                            color: "white",
                            fontSize: 12,
                            fontWeight: 700,
                          }}>
                            {ORDER_STATUS_VI[lookupResult.status] || lookupResult.status}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span>Ngày đặt</span>
                          <span>{lookupResult.placedAt}</span>
                        </div>
                        <div className="summary-row">
                          <span>Người nhận</span>
                          <span>{lookupResult.recipientName}</span>
                        </div>
                        <div className="summary-row">
                          <span>SĐT</span>
                          <span>{lookupResult.recipientPhone}</span>
                        </div>
                        <div className="summary-row">
                          <span>Địa chỉ</span>
                          <span>{[lookupResult.shippingAddressLine1, lookupResult.shippingCity].join(", ")}</span>
                        </div>
                        <div className="summary-row">
                          <span>Thanh toán</span>
                          <span>{PAYMENT_STATUS_VI[lookupResult.paymentStatus] || lookupResult.paymentStatus}</span>
                        </div>
                        {lookupResult.items && lookupResult.items.length > 0 && (
                          <>
                            <div className="summary-divider" style={{ margin: "12px 0" }} />
                            {lookupResult.items.map((item, i) => (
                              <div key={i} className="summary-row" style={{ fontSize: 13 }}>
                                <span>{item.productName} x{item.quantity}</span>
                                <span style={{ color: "var(--primary)" }}>{formatPrice(Number(item.lineTotal))}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="cart-summary">
              <div className="empty-state">
                <div className="empty-icon"><ShoppingCart size={64} color="var(--gray)" /></div>
                <h3>Giỏ hàng trống</h3>
                <p>Hãy thêm sản phẩm để đặt hàng ngay.</p>
                <button className="btn-primary" onClick={() => navigate("products")}>
                  Mua sắm ngay
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── Đặt hàng thành công ──────────────────────────
  if (orderSuccess) {
    return (
      <div>
        <div className="page-hero">
          <h1>ĐẶT HÀNG <span>THÀNH CÔNG</span></h1>
        </div>
        <section className="section">
          <div className="checkout-layout">
            <div className="checkout-form-col">
              <div className="checkout-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", color: "var(--white)", marginBottom: 8 }}>
                  CẢM ƠN BẠN ĐÃ ĐẶT HÀNG!
                </h2>
                <p style={{ color: "var(--gray)", marginBottom: 24 }}>
                  Chúng tôi sẽ xử lý đơn hàng sớm nhất có thể.
                </p>

                <div style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 12, color: "var(--gray)", marginBottom: 4 }}>Mã đơn hàng của bạn</div>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 32,
                    color: "var(--primary)",
                    letterSpacing: 2,
                  }}>
                    {orderSuccess.orderCode}
                  </div>
                </div>

                <div className="summary-divider" />

                <div className="summary-row">
                  <span>Tạm tính</span>
                  <span>{formatPrice(Number(orderSuccess.subtotal))}</span>
                </div>
                {Number(orderSuccess.discountAmount) > 0 && (
                  <div className="summary-row">
                    <span>Giảm giá</span>
                    <span style={{ color: "var(--green)" }}>- {formatPrice(Number(orderSuccess.discountAmount))}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Phí vận chuyển</span>
                  <span>{Number(orderSuccess.shippingFee) === 0 ? "Miễn phí" : formatPrice(Number(orderSuccess.shippingFee))}</span>
                </div>
                <div className="summary-divider" />
                <div className="summary-row summary-total">
                  <span>Tổng cộng</span>
                  <span>{formatPrice(Number(orderSuccess.totalAmount))}</span>
                </div>

                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="btn-outline" style={{ width: "100%" }} onClick={() => navigate("home")}>
                    Về trang chủ
                  </button>
                  {user && (
                    <button className="btn-primary" style={{ width: "100%" }} onClick={() => navigate("orders")}>
                      Xem đơn hàng
                    </button>
                  )}
                  <p style={{ fontSize: 12, color: "var(--gray)", marginTop: 8 }}>
                    Lưu mã đơn <strong style={{ color: "var(--primary)" }}>{orderSuccess.orderCode}</strong> để tra cứu.
                  </p>
                </div>
              </div>
            </div>

            <div className="cart-summary">
              <h3 className="summary-title">Sản phẩm đã đặt</h3>
              {orderSuccess.items && orderSuccess.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14 }}>
                  <span style={{ color: "var(--gray)" }}>{item.productName} x{item.quantity}</span>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>{formatPrice(Number(item.lineTotal))}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────
  if (loadingProfile) {
    return (
      <div className="section" style={{ textAlign: "center", padding: 80 }}>
        <div className="empty-icon"><Clock size={64} color="var(--primary)" /></div>
        <h2>Đang tải...</h2>
      </div>
    );
  }

  // ── Form thanh toán ───────────────────────────────
  return (
    <div>
      <div className="page-hero">
        <h1>THANH <span>TOÁN</span></h1>
        <p>Điền thông tin giao hàng và chọn phương thức thanh toán</p>
      </div>

      <section className="section">
        <div className="checkout-layout">
          {/* Cột trái: Form */}
          <div className="checkout-form-col">
            {/* ── Thông tin giao hàng ── */}
            <div className="checkout-card">
              <h3 className="checkout-card-title">Thông tin giao hàng</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="form-label">Họ và tên người nhận *</label>
                  <input
                    className="form-input"
                    placeholder="Nhập họ tên đầy đủ"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Số điện thoại *</label>
                  <input
                    className="form-input"
                    placeholder="0xxx xxx xxx"
                    value={recipientPhone}
                    onChange={e => setRecipientPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Địa chỉ cụ thể *</label>
                  <input
                    className="form-input"
                    placeholder="Số nhà, đường, phường/xã"
                    value={addressLine1}
                    onChange={e => setAddressLine1(e.target.value)}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">Tỉnh/Thành phố *</label>
                    <input
                      className="form-input"
                      placeholder="TP.HCM"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Quận/Huyện</label>
                    <input
                      className="form-input"
                      placeholder="Quận 1"
                      value={province}
                      onChange={e => setProvince(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Ghi chú</label>
                  <textarea
                    className="form-input"
                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>
            </div>

            {/* ── Phương thức thanh toán ── */}
            <div className="checkout-card">
              <h3 className="checkout-card-title">Phương thức thanh toán</h3>
              <div className="pay-methods">
                {[
                  { id: "cod", icon: <Banknote size={24} />, label: "Thanh toán khi nhận hàng (COD)", desc: "An toàn, tiện lợi" },
                  { id: "banking", icon: <Landmark size={24} />, label: "Chuyển khoản ngân hàng", desc: "Chuyển khoản trước" },
                  { id: "vnpay", icon: <Smartphone size={24} />, label: "VNPay / Ví điện tử", desc: "Thanh toán online" },
                ].map(m => (
                  <label key={m.id} className={`pay-option ${payMethod === m.id ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="pay"
                      value={m.id}
                      checked={payMethod === m.id}
                      onChange={() => setPayMethod(m.id)}
                      style={{ display: "none" }}
                    />
                    <span className="pay-icon">{m.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div className="pay-label">{m.label}</div>
                      <div style={{ fontSize: 11, color: "var(--gray)" }}>{m.desc}</div>
                    </div>
                    {payMethod === m.id && (
                      <span style={{ color: "var(--green)", marginLeft: "auto" }}>✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Cột phải: Tổng kết đơn */}
          <div className="cart-summary">
            <h3 className="summary-title">Đơn hàng của bạn</h3>

            {/* Sản phẩm */}
            <div style={{ marginBottom: 16 }}>
              {cart.map((item) => (
                <div key={item.product.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 28 }}>{item.product.emoji}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>
                        {item.product.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--gray)" }}>x{item.qty}</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--primary)", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18 }}>
                    {formatPrice(item.product.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-divider" />

            {/* Mã giảm giá */}
            <div className="coupon-wrap" style={{ marginBottom: 8 }}>
              <input
                type="text"
                className="search-input"
                placeholder="Mã giảm giá..."
                style={{ flex: 1, textTransform: "uppercase" }}
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
              />
              {couponDiscount > 0 ? (
                <button className="btn-outline" style={{ whiteSpace: "nowrap", padding: "10px 14px" }} onClick={removeCoupon}>
                  Xóa
                </button>
              ) : (
                <button className="btn-primary" style={{ whiteSpace: "nowrap", padding: "10px 14px" }} onClick={applyCoupon}>
                  Áp dụng
                </button>
              )}
            </div>

            {couponMsg && (
              <div style={{ fontSize: 12, marginBottom: 12, color: couponDiscount > 0 ? "var(--green)" : "var(--red)" }}>
                {couponDiscount > 0 ? "✓ " : "✗ "}{couponMsg}
              </div>
            )}

            {/* Tổng kết tiền */}
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
            {discountAmount > 0 && (
              <div className="summary-row">
                <span>Giảm giá</span>
                <span style={{ color: "var(--green)" }}>- {formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="summary-divider" />
            <div className="summary-row summary-total">
              <span>Tổng cộng</span>
              <span>{formatPrice(total)}</span>
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", padding: "16px 0", marginTop: 20, fontSize: 16 }}
              onClick={handlePlaceOrder}
              disabled={!hasRequiredInfo || isSubmitting}
            >
              {isSubmitting ? "Đang xử lý..." : "Đặt hàng ngay →"}
            </button>

            {!hasRequiredInfo && (
              <p style={{ fontSize: 12, color: "var(--gray)", marginTop: 8, textAlign: "center" }}>
                Vui lòng nhập đầy đủ thông tin giao hàng (*)
              </p>
            )}

            <button className="btn-outline" style={{ width: "100%", padding: "12px 0", marginTop: 10 }}
              onClick={() => navigate("cart")}>
              ← Quay lại giỏ hàng
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CheckoutPage;
