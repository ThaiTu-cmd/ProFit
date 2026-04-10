// =====================================================
// pages/HomePage.jsx – Trang chủ
// Props:
//   - navigate: hàm chuyển trang
//   - onAddToCart: thêm sản phẩm vào giỏ
//   - onViewDetail: xem chi tiết sản phẩm
// =====================================================

import { products, categories, formatPrice, renderStars } from "../data/products";
import ProductCard from "../components/ProductCard";
import CategoryCard from "../components/CategoryCard";

const HomePage = ({ navigate, onAddToCart, onViewDetail }) => {
  // Chỉ lấy 4 sản phẩm đầu để hiển thị ở trang chủ
  const featuredProducts = products.slice(0, 4);
  // Chỉ lấy danh mục (bỏ "Tất cả")
  const mainCategories = categories.filter((c) => c.id !== 1);

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-text">
          <span className="hero-badge">🔥 Chính hãng – Nhập khẩu trực tiếp</span>
          <h1 className="hero-title">
            NÂNG CẤP<br />CƠ THỂ<br /><span>CỦA BẠN</span>
          </h1>
          <p className="hero-desc">
            Cung cấp thực phẩm bổ sung chính hãng: Whey Protein, Creatine,
            Pre-Workout và hơn thế nữa. Hiệu quả thật sự – giá cả thật sự.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate("products")}>
              Mua ngay
            </button>
            <button className="btn-outline" onClick={() => navigate("products")}>
              Xem danh mục
            </button>
          </div>
        </div>
        <div className="hero-image">💪</div>
      </section>

      {/* ===== STATS ===== */}
      <div className="stats">
        {[
          { number: "500+",  label: "Sản phẩm"   },
          { number: "20K+",  label: "Khách hàng"  },
          { number: "50+",   label: "Thương hiệu" },
          { number: "100%",  label: "Chính hãng"  },
        ].map((s) => (
          <div className="stat-item" key={s.label}>
            <div className="stat-number">{s.number}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ===== DANH MỤC ===== */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">DANH MỤC <span>NỔI BẬT</span></h2>
          <span className="see-all" onClick={() => navigate("products")}>Xem tất cả →</span>
        </div>
        <div className="category-grid">
          {mainCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isActive={false}
              onClick={() => navigate("products")}
            />
          ))}
        </div>
      </section>

      {/* ===== SẢN PHẨM BÁN CHẠY ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">SẢN PHẨM <span>BÁN CHẠY</span></h2>
          <span className="see-all" onClick={() => navigate("products")}>Xem tất cả →</span>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      </section>

      {/* ===== BANNER KHUYẾN MÃI ===== */}
      <div className="promo-banner" style={{ margin: "0 60px 70px" }}>
        <div className="promo-text">
          <h2>GIẢM 30%<br />ĐƠN HÀNG ĐẦU TIÊN</h2>
          <p>Dùng mã <strong>POWERFUEL30</strong> khi thanh toán. Áp dụng cho tất cả sản phẩm trong tháng này!</p>
        </div>
        <button className="btn-white" onClick={() => navigate("products")}>
          Mua ngay
        </button>
      </div>

      {/* ===== TẠI SAO CHỌN CHÚNG TÔI ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">TẠI SAO CHỌN <span>CHÚNG TÔI?</span></h2>
        </div>
        <div className="features-grid">
          {[
            { icon: "✅", title: "Chính hãng 100%",  desc: "Nhập khẩu trực tiếp từ nhà sản xuất, có tem chống hàng giả." },
            { icon: "🚚", title: "Giao hàng nhanh",  desc: "Giao trong 2–4 giờ tại TP.HCM, 1–2 ngày toàn quốc." },
            { icon: "🔄", title: "Đổi trả dễ dàng", desc: "Đổi trả miễn phí trong 7 ngày nếu sản phẩm có lỗi." },
            { icon: "💬", title: "Tư vấn miễn phí", desc: "Chuyên gia dinh dưỡng tư vấn lộ trình phù hợp với bạn." },
          ].map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">KHÁCH HÀNG <span>NÓI GÌ?</span></h2>
        </div>
        <div className="testimonial-grid">
          {[
            {
              name: "Nguyễn Minh Tuấn",
              role: "Gym 3 năm",
              avatar: "👨",
              text: "Whey Gold Standard từ PowerFuel chất lượng không thua gì hàng xách tay nhưng giá tốt hơn nhiều. Giao hàng nhanh, đóng gói cẩn thận.",
              rating: 5,
            },
            {
              name: "Trần Thị Lan",
              role: "CrossFit athlete",
              avatar: "👩",
              text: "Mình mua Creatine và Pre-Workout ở đây từ 1 năm nay. Nhân viên tư vấn nhiệt tình, hiểu biết. Sẽ tiếp tục ủng hộ!",
              rating: 5,
            },
            {
              name: "Lê Văn Hùng",
              role: "Personal Trainer",
              avatar: "🧑",
              text: "Là PT mình hay giới thiệu học viên mua ở đây. Hàng chính hãng 100%, giá cạnh tranh và nhiều chương trình ưu đãi hấp dẫn.",
              rating: 5,
            },
          ].map((t) => (
            <div className="testimonial-card" key={t.name}>
              <div className="testimonial-header">
                <span className="testimonial-avatar">{t.avatar}</span>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
              <div className="stars" style={{ marginBottom: 10 }}>
                {renderStars(t.rating)}
              </div>
              <p className="testimonial-text">"{t.text}"</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
