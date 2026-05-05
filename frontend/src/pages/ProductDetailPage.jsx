// =====================================================
// pages/ProductDetailPage.jsx – Trang chi tiết sản phẩm
// Props:
//   - product: sản phẩm cần hiển thị
//   - onAddToCart: hàm thêm vào giỏ
//   - navigate: hàm chuyển trang
// =====================================================

import { useState } from "react";
import { formatPrice, renderStars, products } from "../data/products";
import ProductCard from "../components/ProductCard";
import Reviews from "../components/Reviews";

const ProductDetailPage = ({ product, onAddToCart, onViewDetail, navigate }) => {
  // State: số lượng muốn mua
  const [quantity, setQuantity] = useState(1);
  // State: hương vị đang chọn
  const [selectedFlavor, setSelectedFlavor] = useState(product.flavors[0]);

  // Lấy user từ localStorage để truyền vào Reviews
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Tính giá sau khi nhân số lượng
  const totalPrice = product.price * quantity;

  // Tính % giảm giá
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null;

  // Sản phẩm liên quan (cùng danh mục, khác id)
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  return (
    <div>
      {/* Breadcrumb điều hướng */}
      <div className="breadcrumb">
        <span onClick={() => navigate("home")}>Trang chủ</span>
        <span> / </span>
        <span onClick={() => navigate("products")}>Sản phẩm</span>
        <span> / </span>
        <span style={{ color: "var(--primary)" }}>{product.name}</span>
      </div>

      {/* ===== CHI TIẾT SẢN PHẨM ===== */}
      <section className="section">
        <div className="detail-layout">
          {/* Cột trái: ảnh sản phẩm */}
          <div className="detail-image-wrap">
            <div className="detail-image" style={{ padding: 0, overflow: "hidden" }}>
              <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </div>
            {discount && <div className="detail-discount">-{discount}%</div>}
          </div>

          {/* Cột phải: thông tin */}
          <div className="detail-info">
            <div className="product-brand" style={{ fontSize: 14, marginBottom: 8 }}>
              {product.brand}
            </div>
            <h1 className="detail-title">{product.name}</h1>

            {/* Đánh giá */}
            <div className="product-rating" style={{ marginBottom: 16 }}>
              <span className="stars">{renderStars(product.rating)}</span>
              <span className="rating-count">({product.reviews} đánh giá)</span>
              {product.inStock
                ? <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 13 }}>✓ Còn hàng</span>
                : <span style={{ color: "var(--red)",   fontWeight: 700, fontSize: 13 }}>✗ Hết hàng</span>
              }
            </div>

            {/* Giá */}
            <div className="detail-price-wrap">
              <span className="detail-price">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="detail-price-old">{formatPrice(product.oldPrice)}</span>
              )}
            </div>

            {/* Mô tả */}
            <p className="detail-desc">{product.fullDesc}</p>

            {/* Thông số nhanh */}
            <div className="detail-specs">
              <div className="spec-item"><span>⚖️ Trọng lượng</span><strong>{product.weight}</strong></div>
              <div className="spec-item"><span>🥄 Khẩu phần</span><strong>{product.servings} lần dùng</strong></div>
            </div>

            {/* Chọn hương vị */}
            {product.flavors.length > 1 && (
              <div className="detail-flavors">
                <div className="detail-label">Hương vị:</div>
                <div className="flavor-list">
                  {product.flavors.map((f) => (
                    <button
                      key={f}
                      className={`flavor-btn ${selectedFlavor === f ? "active" : ""}`}
                      onClick={() => setSelectedFlavor(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chọn số lượng */}
            <div className="detail-quantity">
              <div className="detail-label">Số lượng:</div>
              <div className="quantity-control">
                <button
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >−</button>
                <span className="qty-value">{quantity}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQuantity((q) => q + 1)}
                >+</button>
              </div>
              <span style={{ color: "var(--gray)", fontSize: 14 }}>
                Tổng: <strong style={{ color: "var(--primary)" }}>{formatPrice(totalPrice)}</strong>
              </span>
            </div>

            {/* Nút hành động */}
            <div className="detail-actions">
              <button
                className="btn-primary"
                style={{ flex: 1, padding: "14px 0" }}
                disabled={!product.inStock}
                onClick={() => {
                  for (let i = 0; i < quantity; i++) onAddToCart(product);
                  navigate("cart");
                }}
              >
                🛒 Mua ngay
              </button>
              <button
                className="btn-outline"
                style={{ flex: 1, padding: "14px 0" }}
                disabled={!product.inStock}
                onClick={() => {
                  for (let i = 0; i < quantity; i++) onAddToCart(product);
                }}
              >
                + Thêm giỏ hàng
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ĐÁNH GIÁ SẢN PHẨM ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <Reviews productId={product.id} user={user} />
      </section>

      {/* ===== SẢN PHẨM LIÊN QUAN ===== */}
      {related.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <h2 className="section-title">SẢN PHẨM <span>LIÊN QUAN</span></h2>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={onAddToCart}
                onViewDetail={onViewDetail}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
