// =====================================================
// components/CategoryCard.jsx – Card danh mục sản phẩm
// Props:
//   - category: object danh mục
//   - isActive: danh mục đang được chọn không?
//   - onClick: hàm xử lý khi click
// =====================================================

const CategoryCard = ({ category, isActive, onClick }) => {
  return (
    <div
      className={`category-card ${isActive ? "active" : ""}`}
      onClick={() => onClick(category)}
    >
      <div className="category-icon">{category.icon}</div>
      <div className="category-name">{category.name}</div>
      <div className="category-count">{category.count} sản phẩm</div>
    </div>
  );
};

export default CategoryCard;
