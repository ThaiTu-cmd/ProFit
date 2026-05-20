// =====================================================
// pages/ProductDetailPage.jsx – Trang chi tiết sản phẩm
// Props:
//   - product: sản phẩm cần hiển thị
//   - onAddToCart: hàm thêm vào giỏ
//   - navigate: hàm chuyển trang
// =====================================================

import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Reviews from "../components/Reviews";
import { getProductsFromApi } from "../services/productService";
import {
  formatPrice,
  mapProductFromApi,
  renderStars,
} from "../utils/productHelpers";

const ProductDetailPage = ({
  product,
  onAddToCart,
  onViewDetail,
  navigate,
}) => {
  if (!product) {
    return (
      <div className="section">
        <div className="empty-state">
          <h3>Không tìm thấy sản phẩm</h3>
          <button className="btn-primary" onClick={() => navigate("products")}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // State: số lượng muốn mua
  const [quantity, setQuantity] = useState(1);
  // State: hương vị đang chọn
  const [selectedFlavor, setSelectedFlavor] = useState(
    (product.flavors && product.flavors[0]) || "Mặc định",
  );
  const [imageSrc, setImageSrc] = useState(product.image);
  const [related, setRelated] = useState([]);

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

  useEffect(() => {
    setImageSrc(product.image);
  }, [product.image, product.id]);

  useEffect(() => {
    let isMounted = true;

    const loadRelatedProducts = async () => {
      if (!product.categoryId) {
        setRelated([]);
        return;
      }

      try {
        const page = await getProductsFromApi({
          categoryId: product.categoryId,
          page: 0,
          size: 12,
        });
        if (!isMounted) return;

        const relatedProducts = page.content
          .map(mapProductFromApi)
          .filter((p) => p.id !== product.id)
          .slice(0, 4);

        setRelated(relatedProducts);
      } catch (error) {
        console.error("Không thể tải sản phẩm liên quan:", error);
      }
    };

    loadRelatedProducts();
    return () => {
      isMounted = false;
    };
  }, [product.id, product.categoryId]);

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
            <div
              className="detail-image"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <img
                src={imageSrc}
                alt={product.name}
                onError={() => {
                  if (imageSrc !== product.imageFallback) {
                    setImageSrc(product.imageFallback);
                  }
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
            {discount && <div className="detail-discount">-{discount}%</div>}
          </div>

          {/* Cột phải: thông tin */}
          <div className="detail-info">
            <div
              className="product-brand"
              style={{ fontSize: 14, marginBottom: 8 }}
            >
              {product.brand}
            </div>
            <h1 className="detail-title">{product.name}</h1>
            {product.categoryName && (
              <div style={{ color: "var(--gray)", marginBottom: 8, fontSize: 14 }}>
                Danh mục: <strong style={{ color: "var(--white)" }}>{product.categoryName}</strong>
              </div>
            )}
            {Array.isArray(product.tags) && product.tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(234,179,8,0.45)",
                      color: "var(--primary)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Đánh giá */}
            <div className="product-rating" style={{ marginBottom: 16 }}>
              <span className="stars">{renderStars(product.rating)}</span>
              <span className="rating-count">({product.reviews} đánh giá)</span>
              {product.inStock ? (
                <span
                  style={{
                    color: "var(--green)",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  ✓ Còn hàng
                </span>
              ) : (
                <span
                  style={{ color: "var(--red)", fontWeight: 700, fontSize: 13 }}
                >
                  ✗ Hết hàng
                </span>
              )}
            </div>

            {/* Giá */}
            <div className="detail-price-wrap">
              <span className="detail-price">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="detail-price-old">
                  {formatPrice(product.oldPrice)}
                </span>
              )}
            </div>

            {/* Mô tả */}
            <p className="detail-desc">{product.fullDesc}</p>

            {/* Thông số nhanh */}
            <div className="detail-specs">
              <div className="spec-item">
                <span>⚖️ Trọng lượng</span>
                <strong>{product.weight}</strong>
              </div>
              <div className="spec-item">
                <span>🥄 Khẩu phần</span>
                <strong>{product.servings} lần dùng</strong>
              </div>
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
                >
                  −
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  +
                </button>
              </div>
              <span style={{ color: "var(--gray)", fontSize: 14 }}>
                Tổng:{" "}
                <strong style={{ color: "var(--primary)" }}>
                  {formatPrice(totalPrice)}
                </strong>
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
            <h2 className="section-title">
              SẢN PHẨM <span>LIÊN QUAN</span>
            </h2>
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
