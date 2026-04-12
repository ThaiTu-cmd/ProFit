// =====================================================
// pages/ProductListPage.jsx – Trang danh sách sản phẩm
// Tính năng: lọc danh mục, tìm kiếm, sắp xếp, lọc cận date
// Props: onAddToCart, onViewDetail
// =====================================================

import { useState } from "react";
import { products, categories } from "../data/products";
import ProductCard from "../components/ProductCard";
import CategoryCard from "../components/CategoryCard";

const ProductListPage = ({ onAddToCart, onViewDetail }) => {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [searchText, setSearchText]         = useState("");
  const [sortBy, setSortBy]                 = useState("default");
  const [showNearExpiry, setShowNearExpiry] = useState(false);

  // Lọc sản phẩm
  let filtered = products.filter((p) => {
    const matchCat    = activeCategory.id === 1 || p.categoryId === activeCategory.id;
    const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase()) ||
                        p.brand.toLowerCase().includes(searchText.toLowerCase());
    const matchExpiry = showNearExpiry ? p.nearExpiry === true : true;
    return matchCat && matchSearch && matchExpiry;
  });

  // Sắp xếp
  if (sortBy === "price-asc")  filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sortBy === "price-desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sortBy === "rating")     filtered = [...filtered].sort((a, b) => b.rating - a.rating);

  const nearExpiryCount = products.filter((p) => p.nearExpiry).length;

  return (
    <div>
      {/* Tiêu đề trang */}
      <div className="page-hero">
        <h1>TẤT CẢ <span>SẢN PHẨM</span></h1>
        <p>Hơn 165 sản phẩm chính hãng từ các thương hiệu hàng đầu thế giới</p>
      </div>

      {/* Banner cận date */}
      {nearExpiryCount > 0 && (
        <div
          className="near-expiry-banner"
          onClick={() => setShowNearExpiry(!showNearExpiry)}
        >
          <span>🔥 Có {nearExpiryCount} sản phẩm cận date – giảm đến 30%</span>
          <span className="near-expiry-toggle">
            {showNearExpiry ? "Xem tất cả" : "Xem ngay →"}
          </span>
        </div>
      )}

      {/* Danh mục */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="category-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isActive={activeCategory.id === cat.id}
              onClick={() => { setActiveCategory(cat); setShowNearExpiry(false); }}
            />
          ))}
        </div>
      </section>

      {/* Filter bar */}
      <section className="section" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--gray)", fontSize: 14, fontWeight: 600 }}>Sắp xếp:</span>
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="default">Mặc định</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>
          </div>

          {/* Toggle cận date */}
          <button
            onClick={() => setShowNearExpiry(!showNearExpiry)}
            style={{
              background: showNearExpiry ? "var(--primary)" : "var(--dark3)",
              border: "1px solid " + (showNearExpiry ? "var(--primary)" : "#444"),
              color: "var(--white)", padding: "10px 16px",
              borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
            }}
          >
            🕐 Cận date {showNearExpiry ? "✓" : ""}
          </button>

          <div style={{ color: "var(--gray)", fontSize: 14 }}>
            Tìm thấy <strong style={{ color: "var(--white)" }}>{filtered.length}</strong> sản phẩm
          </div>
        </div>
      </section>

      {/* Danh sách sản phẩm */}
      <section className="section" style={{ paddingTop: 0 }}>
        {filtered.length > 0 ? (
          <div className="product-grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} onViewDetail={onViewDetail} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Không tìm thấy sản phẩm</h3>
            <p>Thử từ khoá khác hoặc chọn danh mục khác.</p>
            <button className="btn-primary" onClick={() => { setSearchText(""); setActiveCategory(categories[0]); setShowNearExpiry(false); }}>
              Xem tất cả
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductListPage;
