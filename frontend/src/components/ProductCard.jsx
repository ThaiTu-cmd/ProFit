// =====================================================
// components/ProductCard.jsx – Card hiển thị sản phẩm
// Props:
//   - product: object dữ liệu sản phẩm
//   - onAddToCart: hàm thêm vào giỏ
//   - onViewDetail: hàm xem chi tiết
// =====================================================

import { formatPrice, renderStars } from "../data/products";

const ProductCard = ({ product, onAddToCart, onViewDetail }) => {
  return (
    <div className="product-card" onClick={() => onViewDetail(product)}>
      {/* Ảnh / Emoji sản phẩm */}
      <div className="product-img-wrap">
        {product.badge === "SALE" && <span className="badge-sale">SALE</span>}
        {product.badge === "NEW"  && <span className="badge-new">MỚI</span>}
        <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "12px", position: "absolute", top: 0, left: 0 }} />
      </div>

      {/* Thông tin sản phẩm */}
      <div className="product-info">
        <div className="product-brand">{product.brand}</div>
        <div className="product-name">{product.name}</div>

        {/* Đánh giá sao */}
        <div className="product-rating">
          <span className="stars">{renderStars(product.rating)}</span>
          <span className="rating-count">({product.reviews})</span>
        </div>

        {/* Giá & nút thêm giỏ */}
        <div className="product-footer">
          <div>
            <span className="product-price">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="product-price-old">{formatPrice(product.oldPrice)}</span>
            )}
          </div>

          {/* Nút "+" – ngăn sự kiện click ra ngoài card */}
          <button
            className="btn-add"
            onClick={(e) => {
              e.stopPropagation(); // không trigger onViewDetail
              if (product.inStock) {
                onAddToCart(product);
              }
            }}
            title={product.inStock ? "Thêm vào giỏ" : "Hết hàng"}
            style={{ opacity: product.inStock ? 1 : 0.4 }}
          >
            +
          </button>
        </div>

        {/* Trạng thái hết hàng */}
        {!product.inStock && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444", fontWeight: 700 }}>
            Tạm hết hàng
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
