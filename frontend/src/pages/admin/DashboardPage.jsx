// =====================================================
// pages/admin/DashboardPage.jsx – Trang tổng quan Admin
// Props: orders, navigate
// =====================================================

import { formatPrice } from "../../data/products";

const DashboardPage = ({ orders = [], navigate }) => {
  // Tính các số liệu tổng quan
  const totalRevenue  = orders.filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);
  const totalOrders   = orders.length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const todayOrders   = orders.filter(o => o.createdAt === new Date().toLocaleDateString("vi-VN")).length;

  // 5 đơn hàng gần nhất
  const recentOrders = [...orders].reverse().slice(0, 5);

  const STATUS_LABEL = {
    pending:   { text: "Chờ xác nhận", color: "#f59e0b" },
    confirmed: { text: "Đã xác nhận",  color: "#3b82f6" },
    shipping:  { text: "Đang giao",    color: "#8b5cf6" },
    delivered: { text: "Đã nhận",      color: "var(--green)" },
    cancelled: { text: "Đã hủy",       color: "var(--red)" },
  };

  return (
    <div className="section">
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2, marginBottom: 32 }}>
        TỔNG QUAN <span style={{ color: "var(--primary)" }}>HỆ THỐNG</span>
      </h2>

      {/* Thẻ thống kê */}
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
        {/* Đơn hàng gần nhất */}
        <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 28, border: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1 }}>ĐƠN HÀNG GẦN NHẤT</h3>
            <span style={{ color: "var(--primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              onClick={() => navigate("admin-orders")}>Xem tất cả →</span>
          </div>

          {recentOrders.length === 0 ? (
            <p style={{ color: "var(--gray)" }}>Chưa có đơn hàng nào.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {["Mã đơn", "Khách hàng", "Tổng tiền", "Ngày đặt", "Trạng thái"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--gray)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const st = STATUS_LABEL[order.status] ?? STATUS_LABEL.pending;
                  return (
                    <tr key={order.id} style={{ borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}
                      onClick={() => navigate("admin-orders")}>
                      <td style={{ padding: "12px 12px", color: "var(--white)", fontWeight: 700 }}>#{order.id}</td>
                      <td style={{ padding: "12px 12px", color: "var(--white)" }}>{order.info?.fullName ?? "—"}</td>
                      <td style={{ padding: "12px 12px", color: "var(--primary)", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18 }}>{formatPrice(order.total)}</td>
                      <td style={{ padding: "12px 12px", color: "var(--gray)" }}>{order.createdAt}</td>
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

        {/* Menu nhanh */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { icon: "📦", label: "Quản lý sản phẩm", page: "admin-products", desc: "Thêm, sửa, xóa sản phẩm" },
            { icon: "🛒", label: "Quản lý đơn hàng", page: "admin-orders",   desc: "Xử lý & cập nhật đơn" },
            { icon: "🕐", label: "Sản phẩm cận date", page: "admin-products", desc: "Quản lý hàng sắp hết hạn" },
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
