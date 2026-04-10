// =====================================================
// components/Footer.jsx – Phần cuối trang
// Props:
//   - navigate: hàm chuyển trang
// =====================================================

const Footer = ({ navigate }) => {
  return (
    <footer>
      <div className="footer-top">
        {/* Cột 1: Thương hiệu */}
        <div className="footer-brand">
          <span className="logo" onClick={() => navigate("home")} style={{ cursor: "pointer" }}>
            Power<span>Fuel</span>
          </span>
          <p>
            Cung cấp thực phẩm bổ sung chính hãng, uy tín hàng đầu Việt Nam.
            Đồng hành cùng hành trình chinh phục cơ thể của bạn.
          </p>
        </div>

        {/* Cột 2: Sản phẩm */}
        <div className="footer-col">
          <h4>Sản phẩm</h4>
          <ul>
            <li><button onClick={() => navigate("products")}>Whey Protein</button></li>
            <li><button onClick={() => navigate("products")}>Creatine</button></li>
            <li><button onClick={() => navigate("products")}>Pre-Workout</button></li>
            <li><button onClick={() => navigate("products")}>Vitamin & BCAA</button></li>
          </ul>
        </div>

        {/* Cột 3: Thông tin */}
        <div className="footer-col">
          <h4>Thông tin</h4>
          <ul>
            <li><button onClick={() => navigate("about")}>Về chúng tôi</button></li>
            <li><button onClick={() => navigate("contact")}>Blog & Kiến thức</button></li>
            <li><button onClick={() => navigate("contact")}>Chính sách đổi trả</button></li>
            <li><button onClick={() => navigate("contact")}>Điều khoản</button></li>
          </ul>
        </div>

        {/* Cột 4: Liên hệ */}
        <div className="footer-col">
          <h4>Liên hệ</h4>
          <ul>
            <li><button>📍 TP. Hồ Chí Minh</button></li>
            <li><button>📞 0901 234 567</button></li>
            <li><button>✉️ hello@powerfuel.vn</button></li>
          </ul>
        </div>
      </div>

      {/* Dòng cuối footer */}
      <div className="footer-bottom">
        <p>© 2024 PowerFuel. Tất cả quyền được bảo lưu.</p>
        <div className="footer-socials">
          <div className="social-btn">📘</div>
          <div className="social-btn">📸</div>
          <div className="social-btn">▶️</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
