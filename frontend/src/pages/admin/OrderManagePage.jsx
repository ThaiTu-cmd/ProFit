// =====================================================
// pages/admin/OrderManagePage.jsx – Quản lý đơn hàng
// Props: orders, onUpdateStatus, showToast
// =====================================================

import { useState } from "react";
import { formatPrice } from "../../data/products";

const STATUS_LIST = [
  { key: "all",       label: "Tất cả"        },
  { key: "pending",   label: "Chờ xác nhận"  },
  { key: "confirmed", label: "Đã xác nhận"   },
  { key: "shipping",  label: "Đang giao"     },
  { key: "delivered", label: "Đã nhận"       },
  { key: "cancelled", label: "Đã hủy"        },
];

const STATUS_NEXT = {
  pending:   "confirmed",
  confirmed: "shipping",
  shipping:  "delivered",
};

const STATUS_COLOR = {
  pending:   "#f59e0b",
  confirmed: "#3b82f6",
  shipping:  "#8b5cf6",
  delivered: "var(--green)",
  cancelled: "var(--red)",
};

const OrderManagePage = ({ orders = [], onUpdateStatus, showToast }) => {
  const [filter, setFilter]         = useState("all");
  const [search, setSearch]         = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = orders.filter((o) => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch = String(o.id).includes(search) || (o.info?.fullName ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Đếm theo trạng thái
  const countByStatus = (key) => key === "all" ? orders.length : orders.filter(o => o.status === key).length;

  const handleUpdateStatus = (orderId, newStatus) => {
    onUpdateStatus(orderId, newStatus);
    showToast(`✅ Đã cập nhật trạng thái đơn #${orderId}`);
  };

  const handleCancel = (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    onUpdateStatus(orderId, "cancelled");
    showToast(`🗑 Đã hủy đơn #${orderId}`);
  };

  return (
    <div className="section">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 2 }}>
          QUẢN LÝ <span style={{ color: "var(--primary)" }}>ĐƠN HÀNG</span>
        </h2>
      </div>

      {/* Tabs trạng thái */}
      <div className="order-tabs" style={{ marginBottom: 20 }}>
        {STATUS_LIST.map((tab) => (
          <button key={tab.key} className={`order-tab ${filter === tab.key ? "active" : ""}`}
            onClick={() => setFilter(tab.key)}>
            {tab.label}
            <span style={{ marginLeft: 6, fontSize: 11, background: "var(--dark3)", padding: "2px 7px", borderRadius: 10 }}>
              {countByStatus(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Tìm kiếm */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <span>🔍</span>
          <input className="search-input" placeholder="Tìm theo mã đơn, tên khách..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ color: "var(--gray)", fontSize: 14 }}>
          {filtered.length} đơn hàng
        </span>
      </div>

      {/* Bảng đơn hàng */}
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📭</div><h3>Không có đơn hàng</h3></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((order) => {
            const isExpanded  = expandedId === order.id;
            const nextStatus  = STATUS_NEXT[order.status];
            const statusColor = STATUS_COLOR[order.status] ?? "var(--gray)";
            const statusLabel = STATUS_LIST.find(s => s.key === order.status)?.label ?? order.status;

            return (
              <div key={order.id} style={{ background: "var(--card-bg)", borderRadius: 14, border: "1px solid #2a2a2a", overflow: "hidden" }}>
                {/* Hàng tóm tắt */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 16, padding: "16px 20px", alignItems: "center", cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}>

                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Mã đơn</div>
                    <div style={{ fontWeight: 700, color: "var(--white)" }}>#{order.id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Khách hàng</div>
                    <div style={{ fontWeight: 700, color: "var(--white)" }}>{order.info?.fullName ?? "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--gray)" }}>{order.info?.phone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Tổng tiền</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--primary)" }}>{formatPrice(order.total)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 4 }}>Trạng thái</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, border: `1px solid ${statusColor}`, padding: "4px 10px", borderRadius: 6 }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, color: "var(--gray)" }}>{isExpanded ? "▲" : "▼"}</div>
                </div>

                {/* Chi tiết mở rộng */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #2a2a2a", padding: "20px 20px" }}>
                    {/* Sản phẩm */}
                    <div style={{ marginBottom: 20 }}>
                      {order.items?.map((item) => (
                        <div key={item.product.id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 28 }}>{item.product.emoji}</span>
                          <span style={{ flex: 1, fontSize: 13, color: "var(--white)" }}>{item.product.name}</span>
                          <span style={{ fontSize: 13, color: "var(--gray)" }}>x{item.qty}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{formatPrice(item.product.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Địa chỉ giao hàng */}
                    {order.info && (
                      <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 20 }}>
                        📍 {order.info.address}, {order.info.district}, {order.info.city}
                      </div>
                    )}

                    {/* Nút cập nhật */}
                    <div style={{ display: "flex", gap: 10 }}>
                      {nextStatus && (
                        <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}
                          onClick={() => handleUpdateStatus(order.id, nextStatus)}>
                          → Chuyển sang: {STATUS_LIST.find(s => s.key === nextStatus)?.label}
                        </button>
                      )}
                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <button className="btn-danger" onClick={() => handleCancel(order.id)}>Hủy đơn</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderManagePage;
