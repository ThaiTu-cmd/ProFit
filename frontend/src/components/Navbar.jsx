// =====================================================
// components/Navbar.jsx – Thanh điều hướng
// Props:
//   - currentPage: trang hiện tại đang hiển thị
//   - navigate: hàm chuyển trang (nhận tên trang)
//   - cartCount: số sản phẩm trong giỏ hàng
//   - user: thông tin user hiện tại
//   - onLogout: hàm đăng xuất
// =====================================================

const Navbar = ({ currentPage, navigate, cartCount, user, onLogout }) => {
  const menuItems = [
    { label: "Trang chủ", page: "home" },
    { label: "Sản phẩm", page: "products" },
    { label: "Về chúng tôi", page: "about" },
    { label: "Liên hệ", page: "contact" },
  ];

  return (
    <nav className="navbar">
      {/* Logo */}
      <div
        className="logo"
        onClick={() => navigate("home")}
        style={{ cursor: "pointer" }}
      >
        Power<span>Fuel</span>
      </div>

      {/* Menu */}
      <ul className="nav-links">
        {menuItems.map((item) => (
          <li key={item.page}>
            <button
              type="button"
              onClick={() => navigate(item.page)}
              className={currentPage === item.page ? "active" : ""}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Bên phải */}
      <div className="nav-right">
        {/* Giỏ hàng */}
        <button
          type="button"
          className="btn-cart"
          onClick={() => navigate("cart")}
        >
          🛒 Giỏ hàng ({cartCount})
        </button>

        {user ? (
          <>
            {/* Admin */}
            {user.role === "admin" && (
              <button
                type="button"
                className="btn-outline"
                style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={() => navigate("admin-dashboard")}
              >
                ⚙️ Admin
              </button>
            )}

            {/* Hồ sơ người dùng */}
            <button
              type="button"
              className="user-badge"
              onClick={() => navigate("profile")}
              title="Thông tin cá nhân"
            >
              👤 {user.name || "Người dùng"}
            </button>

            {/* Đăng xuất */}
            <button
              type="button"
              className="btn-logout"
              onClick={onLogout}
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn-primary"
            style={{ padding: "10px 20px", fontSize: 14 }}
            onClick={() => navigate("login")}
          >
            Đăng nhập
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;