// =====================================================
// components/Navbar.jsx – Thanh điều hướng
// Props:
//   - currentPage: trang hiện tại đang hiển thị
//   - navigate: hàm chuyển trang (nhận tên trang)
//   - cartCount: số sản phẩm trong giỏ hàng
// =====================================================

const Navbar = ({ currentPage, navigate, cartCount }) => {
  // Danh sách các mục menu
  const menuItems = [
    { label: "Trang chủ", page: "home"     },
    { label: "Sản phẩm",  page: "products" },
    { label: "Về chúng tôi", page: "about" },
    { label: "Liên hệ",   page: "contact"  },
  ];

  return (
    <nav className="navbar">
      {/* Logo – click để về trang chủ */}
      <div className="logo" onClick={() => navigate("home")}>
        Power<span>Fuel</span>
      </div>

      {/* Menu điều hướng */}
      <ul className="nav-links">
        {menuItems.map((item) => (
          <li key={item.page}>
            <button
              onClick={() => navigate(item.page)}
              className={currentPage === item.page ? "active" : ""}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Giỏ hàng */}
      <div className="nav-right">
        <button className="btn-cart" onClick={() => navigate("cart")}>
          🛒 Giỏ hàng ({cartCount})
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
