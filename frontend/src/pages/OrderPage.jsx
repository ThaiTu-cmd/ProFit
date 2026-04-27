// =====================================================
// pages/OrderPage.jsx – Lịch sử đơn hàng của người dùng
// Props: orders, navigate, onViewOrderDetail
// =====================================================

import { useState } from "react";
import { formatPrice } from "../data/products";
import { Package, Inbox } from "lucide-react";

const STATUS_LABEL = {
  PENDING:    { text: "Chờ xác nhận", color: "#f59e0b" },
  CONFIRMED:  { text: "Đã xác nhận",  color: "#3b82f6" },
  SHIPPING:   { text: "Đang giao",    color: "#8b5cf6" },
  DELIVERED:  { text: "Đã giao",      color: "var(--green)" },
  CANCELLED:  { text: "Đã hủy",       color: "var(--red)" },
  REJECTED:   { text: "Từ chối",       color: "#ef4444" },
};

const OrderPage = ({ orders = [], navigate, onViewOrderDetail }) => {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? orders
    : orders.filter((o) => o.status === filter);

  if (orders.length === 0) {
    return (
      <div className="section">
        <div className="empty-state">
          <div className="empty-icon"><Package size={64} color="var(--primary)" /></div>
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
            { key: "all",       label: "Tất cả"       },
            { key: "PENDING",   label: "Chờ xác nhận" },
            { key: "CONFIRMED", label: "Đã xác nhận"  },
            { key: "SHIPPING",  label: "Đang giao"    },
            { key: "DELIVERED", label: "Đã giao"      },
            { key: "CANCELLED", label: "Đã hủy"      },
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
            <div className="empty-icon"><Inbox size={64} color="var(--gray)" /></div>
            <h3>Không có đơn hàng</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            {filtered.map((order) => {
              const st = STATUS_LABEL[order.status] ?? STATUS_LABEL.PENDING;
              const displayDate = order.placedAt || order.createdAt || "";
              const displayCode = order.orderCode || `#${order.id}`;
              const items = order.items || [];

              return (
                <div key={order.id || order.orderCode} className="order-card">
                  {/* Header đơn */}
                  <div className="order-card-header">
                    <div>
                      <span style={{ fontSize: 13, color: "var(--gray)" }}>Mã đơn: </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>{displayCode}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>{displayDate}</div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: st.color,
                      padding: "4px 12px", borderRadius: 6,
                      border: `1px solid ${st.color}`,
                      background: `${st.color}15`,
                    }}>
                      {st.text}
                    </div>
                  </div>

                  {/* Sản phẩm */}
                  <div className="order-items-preview">
                    {items.slice(0, 3).map((item, idx) => {
                      const name = item.productName || (item.product && item.product.name) || "Sản phẩm";
                      const qty  = item.quantity || (item.qty) || 1;
                      const price = item.lineTotal
                        ? Number(item.lineTotal) / qty
                        : (item.product ? item.product.price : 0);
                      const emoji = item.product ? item.product.emoji : "📦";

                      return (
                        <div key={item.id || idx} style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                          borderBottom: idx < Math.min(items.length, 3) - 1 ? "1px solid #2a2a2a" : "none",
                        }}>
                          <span style={{ fontSize: 36 }}>{emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>{name}</div>
                            <div style={{ fontSize: 12, color: "var(--gray)" }}>x{qty}</div>
                          </div>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "var(--primary)" }}>
                            {formatPrice(item.lineTotal ? Number(item.lineTotal) : (price * qty))}
                          </div>
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <div style={{ fontSize: 13, color: "var(--gray)", padding: "8px 0" }}>
                        +{items.length - 3} sản phẩm khác
                      </div>
                    )}
                  </div>

                  {/* Footer đơn */}
                  <div className="order-card-footer">
                    <div>
                      <span style={{ fontSize: 14, color: "var(--gray)" }}>Tổng: </span>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--primary)" }}>
                        {formatPrice(order.totalAmount || order.total || 0)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
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
