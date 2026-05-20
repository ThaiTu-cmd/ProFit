// =====================================================
// pages/ProductListPage.jsx – Trang danh sách sản phẩm
// Tính năng: lọc danh mục, tìm kiếm, sắp xếp, lọc cận date
// Props: onAddToCart, onViewDetail
// =====================================================

import { useState, useEffect } from "react";
import ProductCard from "../components/ProductCard";
import CategoryCard from "../components/CategoryCard";
import { getProductUiData } from "../services/productService";

const ALL_CATEGORY = { id: 0, name: "Tất cả", count: 0, icon: "" };

const ProductListPage = ({ onAddToCart, onViewDetail, initialCategoryId }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([ALL_CATEGORY]);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const { products: productData, categories: categoryData } =
          await getProductUiData(300);
        if (!isMounted) return;

        setProducts(productData);
        setCategories(categoryData.length > 0 ? categoryData : [ALL_CATEGORY]);

        if (initialCategoryId) {
          const selected =
            categoryData.find((c) => c.id === initialCategoryId) ||
            ALL_CATEGORY;
          setActiveCategory(selected);
        } else {
          setActiveCategory(categoryData[0] || ALL_CATEGORY);
        }
      } catch (error) {
        console.error("Không thể tải dữ liệu sản phẩm:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [initialCategoryId]);

  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("default");

  // Lọc sản phẩm
  let filtered = products.filter((p) => {
    const matchCat =
      activeCategory.id === 0 || p.categoryId === activeCategory.id;
    const matchSearch =
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  // Sắp xếp
  if (sortBy === "price-asc")
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sortBy === "price-desc")
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sortBy === "rating")
    filtered = [...filtered].sort((a, b) => b.rating - a.rating);

  return (
    <div>
      {/* Tiêu đề trang */}
      <div className="page-hero">
        <h1>
          TẤT CẢ <span>SẢN PHẨM</span>
        </h1>
        <p>Hơn 165 sản phẩm chính hãng từ các thương hiệu hàng đầu thế giới</p>
      </div>

      {/* Danh mục */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div
          className="category-grid"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isActive={activeCategory.id === cat.id}
              onClick={() => {
                setActiveCategory(cat);
              }}
            />
          ))}
        </div>
      </section>

      {/* Filter bar */}
      <section
        className="section"
        style={{ paddingTop: 24, paddingBottom: 24 }}
      >
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
            <span
              style={{ color: "var(--gray)", fontSize: 14, fontWeight: 600 }}
            >
              Sắp xếp:
            </span>
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

          <div style={{ color: "var(--gray)", fontSize: 14 }}>
            Tìm thấy{" "}
            <strong style={{ color: "var(--white)" }}>{filtered.length}</strong>{" "}
            sản phẩm
          </div>
        </div>
      </section>

      {/* Danh sách sản phẩm */}
      <section className="section" style={{ paddingTop: 0 }}>
        {loading && (
          <div className="empty-state" style={{ marginBottom: 24 }}>
            <h3>Đang tải sản phẩm...</h3>
          </div>
        )}
        {filtered.length > 0 ? (
          <div className="product-grid">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={onAddToCart}
                onViewDetail={onViewDetail}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Không tìm thấy sản phẩm</h3>
            <p>Thử từ khoá khác hoặc chọn danh mục khác.</p>
            <button
              className="btn-primary"
              onClick={() => {
                setSearchText("");
                setActiveCategory(categories[0] || ALL_CATEGORY);
              }}
            >
              Xem tất cả
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductListPage;
