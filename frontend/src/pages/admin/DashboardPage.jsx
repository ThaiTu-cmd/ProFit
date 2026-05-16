import { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";

const formatPrice = (price) => {
  if (!price && price !== 0) return "0₫";
  const num = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(num)) return "0₫";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const DashboardPage = ({ navigate }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await adminService.getAllOrders();
        setOrders(data);
      } catch (error) {
        console.error("Lỗi tải đơn hàng:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Chỉ tính doanh thu từ đơn đã xác nhận (CONFIRMED)
  const totalRevenue  = orders
    .filter(o => o.status === "CONFIRMED")
    .reduce((s, o) => {
      const amount = typeof o.totalAmount === 'string' ? parseFloat(o.totalAmount) : (o.totalAmount || 0);
      return s + amount;
    }, 0);
  const totalOrders   = orders.length;
  const pendingOrders = orders.filter(o => o.status === "PENDING").length;
  
  // Tính đơn hàng hôm nay
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.placedAt && o.placedAt.startsWith(todayStr)).length;

  const recentOrders = [...orders].slice(0, 5); // Đã được sort ở backend (OrderByCreatedAtDesc)

  const STATUS_LABEL = {
    PENDING:   { text: "Chờ xác nhận", color: "#f59e0b" },
    CONFIRMED: { text: "Đã xác nhận",  color: "#22c55e" },
    CANCELLED: { text: "Đã hủy",       color: "var(--red)" },
  };

  return (
    <div className="section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2, margin: 0 }}>
          TỔNG QUAN <span style={{ color: "var(--primary)" }}>HỆ THỐNG</span>
        </h2>

      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 36 }}>
        {[
          { icon: "💰", label: "Doanh thu",        value: formatPrice(totalRevenue), color: "var(--primary)" },
          { icon: "📦", label: "Tổng đơn hàng",    value: totalOrders,              color: "#3b82f6"        },
          { icon: "⏳", label: "Chờ xác nhận",     value: pendingOrders,            color: "#f59e0b"        },
          { icon: "📅", label: "Đơn hàng hôm nay", value: todayOrders,              color: "var(--green)"   },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--card-bg)", borderRadius: 16, padding: 24, border: "1px solid #2a2a2a" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{stat.icon}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 6 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
        <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 28, border: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1 }}>ĐƠN HÀNG GẦN NHẤT</h3>
            <span style={{ color: "var(--primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              onClick={() => navigate("admin-orders")}>Xem tất cả →</span>
          </div>

          {loading ? (
            <p style={{ color: "var(--gray)" }}>Đang tải dữ liệu...</p>
          ) : recentOrders.length === 0 ? (
            <p style={{ color: "var(--gray)" }}>Chưa có đơn hàng nào.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {["Mã đơn", "Khách hàng", "Sản phẩm", "Tổng tiền", "Trạng thái"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--gray)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const st = STATUS_LABEL[order.status] ?? STATUS_LABEL.PENDING;
                  const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
                  return (
                    <tr key={order.id} style={{ borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}
                      onClick={() => navigate("admin-orders")}>
                      <td style={{ padding: "12px 12px", color: "var(--white)", fontWeight: 700 }}>{order.orderCode}</td>
                      <td style={{ padding: "12px 12px", color: "var(--white)" }}>
                        <div>{order.userName || order.userEmail || "Khách vãng lai"}</div>
                        <div style={{ fontSize: 11, color: "var(--gray)" }}>{order.recipientName}</div>
                      </td>
                      <td style={{ padding: "12px 12px", color: "var(--white)", fontSize: 12 }}>
                        {firstItem ? `${firstItem.productName}` : "—"}
                        {(order.items?.length || 0) > 1 && <span style={{ color: "var(--gray)" }}> +{order.items.length - 1}</span>}
                      </td>
                      <td style={{ padding: "12px 12px", color: "var(--primary)", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18 }}>{formatPrice(order.totalAmount)}</td>
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: st.color, border: `1px solid ${st.color}`, padding: "3px 10px", borderRadius: 6 }}>{st.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { icon: "📦", label: "Quản lý sản phẩm", page: "admin-products", desc: "Thêm, sửa, xóa sản phẩm" },
            { icon: "🛒", label: "Quản lý đơn hàng", page: "admin-orders",   desc: "Xử lý & cập nhật đơn" },
            { icon: "👥", label: "Quản lý User",     page: "admin-users",    desc: "Xem & sửa người dùng" }
          ].map((item) => (
            <div key={item.label} onClick={() => navigate(item.page)}
              style={{ background: "var(--card-bg)", borderRadius: 14, padding: "18px 20px", border: "1px solid #2a2a2a", cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--white)", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: "var(--gray)" }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
