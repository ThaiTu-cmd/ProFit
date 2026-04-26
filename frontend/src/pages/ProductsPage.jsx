// =====================================================
// pages/ProductsPage.jsx – Trang danh sách sản phẩm
// Có chức năng: lọc theo danh mục + tìm kiếm
// Props:
//   - onAddToCart: thêm sản phẩm vào giỏ
//   - onViewDetail: xem chi tiết sản phẩm
// =====================================================

import { useState } from "react";
import { products, categories } from "../data/products";
import ProductCard from "../components/ProductCard";
import CategoryCard from "../components/CategoryCard";
import { Search } from "lucide-react";

const ProductsPage = ({ onAddToCart, onViewDetail }) => {
  // State: danh mục đang được chọn
  const [activeCategory, setActiveCategory] = useState(categories[0]); // "Tất cả"
  // State: từ khoá tìm kiếm
  const [searchText, setSearchText] = useState("");
  // State: sắp xếp
  const [sortBy, setSortBy] = useState("default");

  // Lọc sản phẩm theo danh mục và từ khoá tìm kiếm
  let filteredProducts = products.filter((p) => {
    const matchCategory =
      activeCategory.id === 1 || p.categoryId === activeCategory.id;
    const matchSearch =
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchText.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Sắp xếp sản phẩm
  if (sortBy === "price-asc")  filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  if (sortBy === "price-desc") filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  if (sortBy === "rating")     filteredProducts = [...filteredProducts].sort((a, b) => b.rating - a.rating);

  return (
    <div>
      {/* ===== TIÊU ĐỀ TRANG ===== */}
      <div className="page-hero">
        <h1>TẤT CẢ <span>SẢN PHẨM</span></h1>
        <p>Hơn 165 sản phẩm chính hãng từ các thương hiệu hàng đầu thế giới</p>
      </div>

      {/* ===== DANH MỤC ===== */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="category-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isActive={activeCategory.id === cat.id}
              onClick={setActiveCategory}
            />
          ))}
        </div>
      </section>

      {/* ===== THANH TÌM KIẾM & SẮP XẾP ===== */}
      <section className="section" style={{ paddingTop: 30, paddingBottom: 30 }}>
        <div className="filter-bar">
          {/* Ô tìm kiếm */}
          <div className="search-wrap">
            <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={16} color="var(--gray)" /></span>
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* Sắp xếp */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--gray)", fontSize: 14, fontWeight: 600 }}>Sắp xếp:</span>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="default">Mặc định</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>
          </div>

          {/* Số lượng kết quả */}
          <div style={{ color: "var(--gray)", fontSize: 14 }}>
            Tìm thấy <strong style={{ color: "var(--white)" }}>{filteredProducts.length}</strong> sản phẩm
          </div>
        </div>
      </section>

      {/* ===== DANH SÁCH SẢN PHẨM ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        {filteredProducts.length > 0 ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onViewDetail={onViewDetail}
              />
            ))}
          </div>
        ) : (
          /* Khi không có kết quả */
          <div className="empty-state">
            <div className="empty-icon"><Search size={64} color="var(--gray)" /></div>
            <h3>Không tìm thấy sản phẩm</h3>
            <p>Thử tìm kiếm với từ khoá khác hoặc chọn danh mục khác.</p>
            <button className="btn-primary" onClick={() => { setSearchText(""); setActiveCategory(categories[0]); }}>
              Xem tất cả sản phẩm
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductsPage;
