// =====================================================
// pages/OrderPage.jsx – Lịch sử đơn hàng của người dùng
// Props: navigate, onViewOrderDetail, user
// =====================================================

import { useState, useEffect } from "react";
import { formatPrice } from "../data/products";
import { Package, Inbox, RefreshCw, Loader2 } from "lucide-react";
import { apiGetMyOrders, isLoggedIn } from "../utils/api";

// Nhãn trạng thái đơn hàng
const STATUS_LABEL = {
  PENDING:   { text: "Chờ xác nhận", color: "#f59e0b" },
  CONFIRMED: { text: "Đã xác nhận",  color: "#3b82f6" },
  SHIPPING:  { text: "Đang giao",    color: "#8b5cf6" },
  DELIVERED: { text: "Đã nhận",      color: "var(--green)" },
  CANCELLED: { text: "Đã hủy",       color: "var(--red)" },
};

// Format ngày từ LocalDateTime của Java
const formatDate = (dateStr) => {
  if (!dateStr) return "";
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

// Chuyển đổi dữ liệu từ BE (snake_case) sang format FE (camelCase)
const transformOrderFromBE = (beOrder) => {
  return {
    id: beOrder.id,
    orderCode: beOrder.orderCode,
    recipientName: beOrder.recipientName,
    recipientPhone: beOrder.recipientPhone,
    shippingAddress: beOrder.shippingAddressLine1,
    city: beOrder.shippingCity,
    province: beOrder.shippingProvince,
    total: beOrder.totalAmount,
    status: beOrder.status?.toLowerCase() || "pending",
    paymentStatus: beOrder.paymentStatus,
    createdAt: beOrder.placedAt || beOrder.createdAt,
    placedAt: beOrder.placedAt,
    userName: beOrder.userName,
    // Chuyển items từ BE format
    items: (beOrder.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      // Tạo object product tương thích với UI cũ
      product: {
        id: item.productId,
        name: item.productName,
        sku: item.productSku,
        price: typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice),
        // emoji mặc định nếu không có
        emoji: "🏋️",
      },
    })),
  };
};

const OrderPage = ({ navigate, onViewOrderDetail, user }) => {
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [localOrders, setLocalOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load orders từ BE khi user đã đăng nhập
  useEffect(() => {
    const fetchOrders = async () => {
      // Luôn load local orders trước (đơn đặt offline)
      const savedLocal = localStorage.getItem("localOrders");
      if (savedLocal) {
        try {
          setLocalOrders(JSON.parse(savedLocal));
        } catch {
          setLocalOrders([]);
        }
      }

      // Nếu chưa đăng nhập, chỉ hiển thị local orders
      if (!isLoggedIn()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const beOrders = await apiGetMyOrders();
        const transformed = (beOrders || []).map(transformOrderFromBE);
        setOrders(transformed);
      } catch (err) {
        console.error("Lỗi khi lấy đơn hàng:", err);
        setError(err.message);
        // Vẫn hiển thị local orders nếu API lỗi
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Kết hợp orders từ BE và local orders
  const allOrders = [...orders, ...localOrders.filter(
    lo => !orders.some(ro => ro.orderCode === lo.orderCode)
  )];

  // Sort theo ngày mới nhất
  const sortedOrders = [...allOrders].sort((a, b) => {
    const dateA = new Date(a.placedAt || a.createdAt);
    const dateB = new Date(b.placedAt || b.createdAt);
    return dateB - dateA;
  });

  const filtered = filter === "all" ? sortedOrders : sortedOrders.filter((o) => o.status === filter);

  // Loading state
  if (loading) {
    return (
      <div className="section">
        <div className="page-hero">
          <h1>ĐƠN HÀNG <span>CỦA TÔI</span></h1>
        </div>
        <div className="empty-state">
          <Loader2 size={48} color="var(--primary)" className="spinning" />
          <h3>Đang tải đơn hàng...</h3>
        </div>
      </div>
    );
  }

  if (sortedOrders.length === 0) {
    return (
      <div className="section">
        <div className="page-hero">
          <h1>ĐƠN HÀNG <span>CỦA TÔI</span></h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon"><Package size={64} color="var(--primary)" /></div>
          <h3>Chưa có đơn hàng nào</h3>
          <p>{isLoggedIn() ? "Hãy mua sắm và theo dõi đơn hàng của bạn tại đây." : "Đăng nhập để xem đơn hàng của bạn."}</p>
          <button className="btn-primary" onClick={() => navigate("products")}>Mua sắm ngay</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-hero">
        <h1>ĐƠN HÀNG <span>CỦA TÔI</span></h1>
        <p>{sortedOrders.length} đơn hàng</p>
      </div>

      <section className="section">
        {/* Error banner nếu có */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--red)",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "var(--red)",
          }}>
            <RefreshCw size={18} />
            <span>{error} - Hiển thị đơn hàng đã lưu cục bộ.</span>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginLeft: "auto",
                background: "var(--red)",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="order-tabs">
          {[
            { key: "all",       label: "Tất cả" },
            { key: "pending",   label: "Chờ xác nhận" },
            { key: "confirmed", label: "Đã xác nhận" },
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
            <div className="empty-icon"><Inbox size={64} color="var(--gray)" /></div>
            <h3>Không có đơn hàng</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            {filtered.map((order) => {
              const st = STATUS_LABEL[order.status?.toUpperCase()] ?? STATUS_LABEL.PENDING;
              return (
                <div key={order.id || order.orderCode} className="order-card">
                  {/* Header đơn */}
                  <div className="order-card-header">
                    <div>
                      <span style={{ fontSize: 13, color: "var(--gray)" }}>Mã đơn: </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>
                        {order.orderCode || `#${order.id}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--gray)" }}>
                      {formatDate(order.placedAt || order.createdAt)}
                    </div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: st.color,
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: `1px solid ${st.color}`,
                      textTransform: "uppercase"
                    }}>
                      {st.text}
                    </div>
                  </div>

                  {/* Sản phẩm */}
                  <div className="order-items-preview">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div
                        key={item.id || item.productId || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 0",
                          borderBottom: idx < Math.min(order.items.length, 3) - 1 ? "1px solid #2a2a2a" : "none"
                        }}
                      >
                        <span style={{ fontSize: 36 }}>{item.product?.emoji || "🏋️"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)" }}>
                            {item.productName || item.product?.name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--gray)" }}>
                            x{item.quantity}
                          </div>
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "var(--primary)" }}>
                          {formatPrice(typeof item.lineTotal === 'number' ? item.lineTotal : parseFloat(item.lineTotal))}
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
                        {formatPrice(typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount))}
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
