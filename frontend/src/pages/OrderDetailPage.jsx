// =====================================================
// pages/OrderDetailPage.jsx – Chi tiết một đơn hàng
// Props: order, navigate
// =====================================================

import { formatPrice } from "../data/products";

const STATUS_STEPS = ["pending", "confirmed", "shipping", "delivered"];

const STATUS_LABEL = {
  pending:   "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping:  "Đang giao hàng",
  delivered: "Đã nhận hàng",
  cancelled: "Đã hủy",
};

const OrderDetailPage = ({ order, navigate }) => {
  if (!order) {
    return (
      <div className="section">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>Không tìm thấy đơn hàng</h3>
          <button className="btn-primary" onClick={() => navigate("orders")}>Quay lại</button>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span onClick={() => navigate("home")}>Trang chủ</span>
        <span> / </span>
        <span onClick={() => navigate("orders")}>Đơn hàng</span>
        <span> / </span>
        <span style={{ color: "var(--primary)" }}>#{order.id}</span>
      </div>

      <section className="section">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 32 }}>

          {/* Cột trái */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Thanh tiến trình đơn hàng */}
            {!isCancelled && (
              <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 28, border: "1px solid #2a2a2a" }}>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginBottom: 24, letterSpacing: 1 }}>
                  TRẠNG THÁI ĐƠN HÀNG
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  {STATUS_STEPS.map((step, i) => (
                    <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
                      {/* Vòng tròn */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: i <= currentStep ? "var(--primary)" : "var(--dark3)",
                          border: `2px solid ${i <= currentStep ? "var(--primary)" : "#444"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, transition: "all 0.3s",
                        }}>
                          {i < currentStep ? "✓" : i === currentStep ? "●" : "○"}
                        </div>
                        <span style={{ fontSize: 11, color: i <= currentStep ? "var(--white)" : "var(--gray)", textAlign: "center", whiteSpace: "nowrap" }}>
                          {STATUS_LABEL[step]}
                        </span>
                      </div>
                      {/* Đường nối */}
                      {i < STATUS_STEPS.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: i < currentStep ? "var(--primary)" : "#2a2a2a", margin: "0 8px", marginBottom: 28 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isCancelled && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)", borderRadius: 16, padding: 20, color: "var(--red)", fontWeight: 700 }}>
                ✗ Đơn hàng này đã bị hủy
              </div>
            )}

            {/* Sản phẩm trong đơn */}
            <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 28, border: "1px solid #2a2a2a" }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginBottom: 20, letterSpacing: 1 }}>
                SẢN PHẨM ĐÃ ĐẶT
              </h3>
              {order.items.map((item) => (
                <div key={item.product.id} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: "1px solid #2a2a2a", alignItems: "center" }}>
                  <div style={{ fontSize: 52, background: "var(--dark3)", borderRadius: 12, padding: "8px 12px" }}>{item.product.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>{item.product.name}</div>
                    <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>{item.product.brand}</div>
                    <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 4 }}>
                      {formatPrice(item.product.price)} × {item.qty}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--primary)" }}>
                    {formatPrice(item.product.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>

            {/* Thông tin giao hàng */}
            {order.info && (
              <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 28, border: "1px solid #2a2a2a" }}>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginBottom: 20, letterSpacing: 1 }}>
                  THÔNG TIN GIAO HÀNG
                </h3>
                {[
                  ["👤 Người nhận", order.info.fullName],
                  ["📞 Số điện thoại", order.info.phone],
                  ["📍 Địa chỉ", `${order.info.address}, ${order.info.district}, ${order.info.city}`],
                  ["💳 Thanh toán", order.payMethod === "cod" ? "Thanh toán khi nhận hàng" : order.payMethod === "banking" ? "Chuyển khoản" : "VNPay"],
                ].map(([label, value]) => value && (
                  <div key={label} style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 14 }}>
                    <span style={{ color: "var(--gray)", minWidth: 140 }}>{label}</span>
                    <span style={{ color: "var(--white)", fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cột phải: Tổng kết */}
          <div className="cart-summary" style={{ position: "sticky", top: 90 }}>
            <h3 className="summary-title">TÓM TẮT ĐƠN #{order.id}</h3>
            <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 20 }}>Ngày đặt: {order.createdAt}</div>

            <div className="summary-row"><span>Tạm tính</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span style={{ color: order.shipping === 0 ? "var(--green)" : "inherit" }}>
                {order.shipping === 0 ? "Miễn phí" : formatPrice(order.shipping)}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="summary-row"><span>Giảm giá</span><span style={{ color: "var(--green)" }}>- {formatPrice(order.discount)}</span></div>
            )}
            <div className="summary-divider"></div>
            <div className="summary-row summary-total"><span>Tổng cộng</span><span>{formatPrice(order.total)}</span></div>

            <button className="btn-outline" style={{ width: "100%", padding: "12px 0", marginTop: 20 }}
              onClick={() => navigate("orders")}>
              ← Về danh sách đơn
            </button>
            {order.status === "delivered" && (
              <button className="btn-primary" style={{ width: "100%", padding: "12px 0", marginTop: 10 }}
                onClick={() => navigate("products")}>
                Mua lại
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrderDetailPage;
