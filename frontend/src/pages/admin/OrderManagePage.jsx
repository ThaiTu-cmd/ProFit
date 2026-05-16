import { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const STATUS_LIST = [
  { key: "all",       label: "Tất cả",       color: "var(--white)"      },
  { key: "PENDING",   label: "Chờ xác nhận", color: "#f59e0b"          },
  { key: "CONFIRMED", label: "Đã xác nhận",  color: "#22c55e"          },
  { key: "SHIPPED",   label: "Đang giao",    color: "#8b5cf6"          },
  { key: "COMPLETED", label: "Hoàn tất",      color: "var(--green)"      },
  { key: "CANCELLED", label: "Đã hủy",       color: "var(--red)"        },
];

const STATUS_NEXT = {
  PENDING:   "CONFIRMED",
  CONFIRMED: "SHIPPED",
  SHIPPED:   "COMPLETED",
};

const STATUS_COLOR = {
  PENDING:   "#f59e0b",
  CONFIRMED: "#22c55e",
  SHIPPED:   "#8b5cf6",
  COMPLETED: "var(--green)",
  CANCELLED: "var(--red)",
};

const OrderManagePage = ({ showToast, navigate }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllOrders();
      setOrders(data);
    } catch (error) {
      showToast(`❌ Lỗi tải đơn hàng: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = orders.filter((o) => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch = String(o.orderCode).toLowerCase().includes(search.toLowerCase()) || 
                        (o.recipientName || "").toLowerCase().includes(search.toLowerCase()) ||
                        String(o.id).includes(search);
    return matchStatus && matchSearch;
  });

  const countByStatus = (key) => key === "all" ? orders.length : orders.filter(o => o.status === key).length;

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await adminService.updateOrderStatus(orderId, { status: newStatus });
      showToast(`✅ Đã cập nhật trạng thái đơn #${orderId}`);
      fetchOrders();
    } catch (error) {
      showToast(`❌ Lỗi cập nhật trạng thái: ${error.message}`);
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;
    try {
      await adminService.updateOrderStatus(orderId, { status: "CANCELLED" });
      showToast(`🗑 Đã hủy đơn #${orderId}`);
      fetchOrders();
    } catch (error) {
      showToast(`❌ Lỗi hủy đơn: ${error.message}`);
    }
  };

  return (
    <div className="section">
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => navigate("admin-dashboard")}
          style={{
            background: "transparent",
            border: "1px solid var(--gray)",
            color: "var(--gray)",
            padding: "8px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Quay lại
        </button>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 2 }}>
          QUẢN LÝ <span style={{ color: "var(--primary)" }}>ĐƠN HÀNG</span>
        </h2>
        <div style={{ width: 80 }}></div>
      </div>

      <div className="order-tabs" style={{ marginBottom: 20 }}>
        {STATUS_LIST.map((tab) => {
          const count = countByStatus(tab.key);
          const isActive = filter === tab.key;
          return (
            <button key={tab.key} 
              className={`order-tab ${isActive ? "active" : ""}`}
              style={{
                ...(isActive && tab.key !== "all" ? {
                  background: `${tab.color}20`,
                  borderColor: tab.color,
                  color: tab.color,
                } : {}),
              }}
              onClick={() => setFilter(tab.key)}>
              {tab.label}
              <span style={{ marginLeft: 6, fontSize: 11, background: "var(--dark3)", padding: "2px 7px", borderRadius: 10 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <span>🔍</span>
          <input className="search-input" placeholder="Tìm theo mã đơn, tên khách..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ color: "var(--gray)", fontSize: 14 }}>
          {filtered.length} đơn hàng
        </span>
      </div>

      {loading ? (
        <div className="empty-state"><h3>Đang tải dữ liệu...</h3></div>
      ) : filtered.length === 0 ? (
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 16, padding: "16px 20px", alignItems: "center", cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}>

                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Mã đơn</div>
                    <div style={{ fontWeight: 700, color: "var(--white)" }}>{order.orderCode}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Khách hàng</div>
                    <div style={{ fontWeight: 700, color: "var(--white)" }}>{order.recipientName || "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--gray)" }}>{order.recipientPhone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Người đặt</div>
                    <div style={{ fontWeight: 600, color: "var(--white)" }}>{order.userName || "Khách vãng lai"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Ngày đặt</div>
                    <div style={{ fontSize: 12, color: "var(--white)" }}>{formatDate(order.placedAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 4 }}>Trạng thái</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, border: `1px solid ${statusColor}`, padding: "4px 10px", borderRadius: 6 }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, color: "var(--gray)" }}>{isExpanded ? "▲" : "▼"}</div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #2a2a2a", padding: "20px 20px" }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 8 }}>📦 Sản phẩm:</div>
                      {order.items?.map((item) => (
                        <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                          <span style={{ flex: 1, fontSize: 13, color: "var(--white)" }}>{item.productName} (SKU: {item.productSku})</span>
                          <span style={{ fontSize: 13, color: "var(--gray)" }}>x{item.quantity}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{formatPrice(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: "var(--gray)" }}>
                        💰 <strong style={{ color: "var(--white)" }}>Tổng tiền:</strong> {formatPrice(order.totalAmount)}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--gray)" }}>
                        📍 <strong style={{ color: "var(--white)" }}>Địa chỉ:</strong> {order.shippingAddressLine1}, {order.shippingCity}, {order.shippingProvince}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      {nextStatus && (
                        <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}
                          onClick={() => handleUpdateStatus(order.id, nextStatus)}>
                          ✓ Xác nhận đơn
                        </button>
                      )}
                      {order.status !== "COMPLETED" && order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
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
