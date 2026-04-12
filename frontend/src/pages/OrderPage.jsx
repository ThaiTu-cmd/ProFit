// =====================================================
// pages/OrderPage.jsx – Lịch sử đơn hàng của người dùng
// Props: orders, navigate, onViewOrderDetail
// =====================================================

import { useState } from "react";
import { formatPrice } from "../data/products";

// Nhãn trạng thái đơn hàng
const STATUS_LABEL = {
  pending:   { text: "Chờ xác nhận", color: "#f59e0b" },
  confirmed: { text: "Đã xác nhận",  color: "#3b82f6" },
  shipping:  { text: "Đang giao",    color: "#8b5cf6" },
  delivered: { text: "Đã nhận",      color: "var(--green)" },
  cancelled: { text: "Đã hủy",       color: "var(--red)" },
};

const OrderPage = ({ orders = [], navigate, onViewOrderDetail }) => {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (orders.length === 0) {
    return (
      <div className="section">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>Chưa có đơn hàng nào</h3>
          <p>Hãy mua sắm và theo dõi đơn hàng của bạn tại đây.</p>
          <button className="btn-primary" onClick={() => navigate("products")}>Mua sắm ngay</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-hero">
        <h1>ĐƠN HÀNG <span>CỦA TÔI</span></h1>
        <p>{orders.length} đơn hàng</p>
      </div>

      <section className="section">
        {/* Filter tabs */}
        <div className="order-tabs">
          {[
            { key: "all",       label: "Tất cả" },
            { key: "pending",   label: "Chờ xác nhận" },
            { key: "shipping",  label: "Đang giao" },
            { key: "delivered", label: "Đã nhận" },
            { key: "cancelled", label: "Đã hủy" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`order-tab ${filter === tab.key ? "active" : ""}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Danh sách đơn */}
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 0" }}>
            <div className="empty-icon">📭</div>
            <h3>Không có đơn hàng</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            {filtered.map((order) => {
              const st = STATUS_LABEL[order.status] ?? STATUS_LABEL.pending;
              return (
                <div key={order.id} className="order-card">
                  {/* Header đơn */}
                  <div className="order-card-header">
                    <div>
                      <span style={{ fontSize: 13, color: "var(--gray)" }}>Mã đơn: </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>#{order.id}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>{order.createdAt}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: st.color, padding: "4px 12px", borderRadius: 6, border: `1px solid ${st.color}` }}>
                      {st.text}
                    </div>
                  </div>

                  {/* Sản phẩm */}
                  <div className="order-items-preview">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.product.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #2a2a2a" }}>
                        <span style={{ fontSize: 36 }}>{item.product.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>{item.product.name}</div>
                          <div style={{ fontSize: 12, color: "var(--gray)" }}>x{item.qty}</div>
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "var(--primary)" }}>
                          {formatPrice(item.product.price * item.qty)}
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div style={{ fontSize: 13, color: "var(--gray)", padding: "8px 0" }}>
                        +{order.items.length - 3} sản phẩm khác
                      </div>
                    )}
                  </div>

                  {/* Footer đơn */}
                  <div className="order-card-footer">
                    <div>
                      <span style={{ fontSize: 14, color: "var(--gray)" }}>Tổng: </span>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--primary)" }}>
                        {formatPrice(order.total)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {order.status === "delivered" && (
                        <button className="btn-outline" style={{ padding: "8px 16px", fontSize: 13 }}>
                          Mua lại
                        </button>
                      )}
                      <button className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}
                        onClick={() => onViewOrderDetail(order)}>
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default OrderPage;
