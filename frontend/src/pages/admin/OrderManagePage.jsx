import { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";

const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
};

const STATUS_LIST = [
  { key: "all",            label: "Tất cả"         },
  { key: "PENDING",        label: "Chờ xác nhận"   },
  { key: "CONFIRMED",      label: "Đã xác nhận"    },
  { key: "DELIVERED",      label: "Đã giao hàng"   },
  { key: "COMPLETED",      label: "Hoàn thành"     },
  { key: "CANCELLED",      label: "Đã hủy"         },
  { key: "PENDING_CONFIRM", label: "Chờ thanh toán" },
];

const STATUS_NEXT = {
  PENDING: "CONFIRMED",
  PENDING_CONFIRM: "CONFIRMED", // Admin confirm banking payment
  CONFIRMED: "DELIVERED",       // Shipper marks as delivered
  DELIVERED: "COMPLETED",       // Admin confirms customer received (reduces stock)
};

const STATUS_COLOR = {
  PENDING:        "#f59e0b",
  CONFIRMED:      "#8b5cf6",    // Purple for confirmed
  DELIVERED:      "#3b82f6",    // Blue for delivered
  COMPLETED:      "var(--green)",
  CANCELLED:      "var(--red)",
  PENDING_CONFIRM: "#3b82f6", // Blue for banking payment pending
};

const OrderManagePage = ({ onUpdateStatus, showToast }) => {
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

  // Sắp xếp ưu tiên: PENDING_CONFIRM lên đầu, sau đó theo thời gian
  const sortedOrders = [...orders].sort((a, b) => {
    // Ưu tiên PENDING_CONFIRM lên đầu
    if (a.paymentStatus === "PENDING_CONFIRM" && b.paymentStatus !== "PENDING_CONFIRM") return -1;
    if (a.paymentStatus !== "PENDING_CONFIRM" && b.paymentStatus === "PENDING_CONFIRM") return 1;
    // Sau đó theo thời gian (mới nhất lên đầu)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filtered = sortedOrders.filter((o) => {
    const matchStatus = filter === "all" || o.status === filter;
    // Nếu filter là PENDING_CONFIRM thì lọc theo paymentStatus
    const matchPaymentStatus = filter === "PENDING_CONFIRM" 
      ? o.paymentStatus === "PENDING_CONFIRM" 
      : true;
    const matchSearch = String(o.orderCode).toLowerCase().includes(search.toLowerCase()) || 
                        (o.recipientName || "").toLowerCase().includes(search.toLowerCase()) ||
                        String(o.id).includes(search);
    return matchStatus && matchSearch && matchPaymentStatus;
  });

  const countByStatus = (key) => {
    if (key === "all") return orders.length;
    if (key === "PENDING_CONFIRM") return orders.filter(o => o.paymentStatus === "PENDING_CONFIRM").length;
    return orders.filter(o => o.status === key).length;
  };

  const handleUpdateStatus = async (orderId, statusData) => {
    try {
      // Support both string (backward compatible) and object format
      const data = typeof statusData === 'string' ? { status: statusData } : statusData;
      await adminService.updateOrderStatus(orderId, data);
      showToast(`✅ Đã cập nhật trạng thái đơn #${orderId}`);
      if (onUpdateStatus) onUpdateStatus(orderId, data.status || data.paymentStatus);
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
      if (onUpdateStatus) onUpdateStatus(orderId, "CANCELLED");
      fetchOrders();
    } catch (error) {
      showToast(`❌ Lỗi hủy đơn: ${error.message}`);
    }
  };

  return (
    <div className="section">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 2 }}>
          QUẢN LÝ <span style={{ color: "var(--primary)" }}>ĐƠN HÀNG</span>
        </h2>
      </div>

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
            const nextStatus  = STATUS_NEXT[order.status] || (order.paymentStatus === "PENDING_CONFIRM" ? "CONFIRMED" : null);
            const statusColor = STATUS_COLOR[order.status] ?? STATUS_COLOR[order.paymentStatus] ?? "var(--gray)";
            const statusLabel = STATUS_LIST.find(s => s.key === order.status)?.label ?? 
                               (order.paymentStatus === "PENDING_CONFIRM" ? "Chờ thanh toán" : order.status);
            const isPendingConfirm = order.paymentStatus === "PENDING_CONFIRM";

            return (
              <div key={order.id} style={{ background: "var(--card-bg)", borderRadius: 14, border: "1px solid #2a2a2a", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 16, padding: "16px 20px", alignItems: "center", cursor: "pointer" }}
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
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>Tổng tiền</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--primary)" }}>{formatPrice(order.totalAmount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 4 }}>Trạng thái</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, border: `1px solid ${statusColor}`, padding: "4px 10px", borderRadius: 6 }}>
                      {statusLabel}
                    </span>
                    {isPendingConfirm && (
                      <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4 }}>
                        💳 Thanh toán chuyển khoản
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 18, color: "var(--gray)" }}>{isExpanded ? "▲" : "▼"}</div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #2a2a2a", padding: "20px 20px" }}>
                    <div style={{ marginBottom: 20 }}>
                      {order.items?.map((item) => (
                        <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                          <span style={{ flex: 1, fontSize: 13, color: "var(--white)" }}>{item.productName} (SKU: {item.productSku})</span>
                          <span style={{ fontSize: 13, color: "var(--gray)" }}>x{item.quantity}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{formatPrice(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 20 }}>
                      📍 {order.shippingAddressLine1}, {order.shippingCity}, {order.shippingProvince}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {/* Nút xác nhận thanh toán cho banking */}
                      {order.paymentStatus === "PENDING_CONFIRM" && (
                        <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 13, background: "var(--green)" }}
                          onClick={() => handleUpdateStatus(order.id, { status: "CONFIRMED", paymentStatus: "PAID" })}>
                          ✓ Xác nhận thanh toán
                        </button>
                      )}
                      {nextStatus && order.paymentStatus !== "PENDING_CONFIRM" && (
                        <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}
                          onClick={() => handleUpdateStatus(order.id, { status: nextStatus })}>
                          {order.status === "CONFIRMED" ? "🚚 Đã giao hàng" : 
                           order.status === "DELIVERED" ? "✓ Xác nhận hoàn thành" : 
                           "✓ Xác nhận đơn hàng"}
                        </button>
                      )}
                      {order.status === "PENDING" && order.paymentStatus !== "PENDING_CONFIRM" && (
                        <button className="btn-danger" onClick={() => handleCancel(order.id)}>Hủy đơn</button>
                      )}
                    </div>
                    {/* Thông báo trạng thái kho */}
                    {order.status === "DELIVERED" && (
                      <div style={{ marginTop: 12, fontSize: 12, color: "var(--amber)", background: "rgba(251,191,36,0.1)", padding: "10px 14px", borderRadius: 8 }}>
                        ⚠️ Khi xác nhận hoàn thành, số lượng sản phẩm trong kho sẽ được trừ đi.
                      </div>
                    )}
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
