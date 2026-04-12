// =====================================================
// pages/CartPage.jsx – Trang giỏ hàng
// Props:
//   - cart: mảng { product, qty }
//   - onUpdateQty: cập nhật số lượng
//   - onRemove: xóa sản phẩm
//   - navigate: chuyển trang
// =====================================================


// CẬP NHẬT: nút "Thanh toán" đã navigate đúng sang checkout
//           bỏ ô mã giảm giá (đã chuyển sang CheckoutPage)

import { formatPrice } from "../data/products";

const CartPage = ({ cart, onUpdateQty, onRemove, navigate }) => {
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const shipping = subtotal >= 500000 ? 0 : 30000;
  const total    = subtotal + shipping;

  // Giỏ rỗng
  if (cart.length === 0) {
    return (
      <div className="section">
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <h3>Giỏ hàng trống</h3>
          <p>Bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
          <button className="btn-primary" onClick={() => navigate("products")}>
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-hero">
        <h1>GIỎ <span>HÀNG</span></h1>
        <p>{cart.length} sản phẩm đang chờ bạn thanh toán</p>
      </div>

      <section className="section">
        <div className="cart-layout">

          {/* Danh sách sản phẩm */}
          <div className="cart-items">
            <div className="cart-header">
              <span>Sản phẩm</span>
              <span>Giá</span>
              <span>Số lượng</span>
              <span>Thành tiền</span>
              <span></span>
            </div>

            {cart.map((item) => (
              <div className="cart-row" key={item.product.id}>
                {/* Ảnh + tên */}
                <div className="cart-product">
                  <div className="cart-emoji">{item.product.emoji}</div>
                  <div>
                    <div className="cart-name">{item.product.name}</div>
                    <div className="cart-brand">{item.product.brand}</div>
                  </div>
                </div>

                {/* Giá đơn */}
                <div className="cart-price">{formatPrice(item.product.price)}</div>

                {/* Số lượng */}
                <div className="quantity-control">
                  <button className="qty-btn" onClick={() => onUpdateQty(item.product.id, item.qty - 1)}>−</button>
                  <span className="qty-value">{item.qty}</span>
                  <button className="qty-btn" onClick={() => onUpdateQty(item.product.id, item.qty + 1)}>+</button>
                </div>

                {/* Thành tiền */}
                <div style={{ color: "var(--primary)", fontFamily: "'Bebas Neue', sans-serif", fontSize: 20 }}>
                  {formatPrice(item.product.price * item.qty)}
                </div>

                {/* Xóa */}
                <button className="btn-danger" onClick={() => onRemove(item.product.id)}>🗑</button>
              </div>
            ))}
          </div>

          {/* Tóm tắt */}
          <div className="cart-summary">
            <h3 className="summary-title">Tóm tắt đơn hàng</h3>

            <div className="summary-row">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <span style={{ color: shipping === 0 ? "var(--green)" : "inherit" }}>
                {shipping === 0 ? "Miễn phí" : formatPrice(shipping)}
              </span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-row summary-total">
              <span>Tổng cộng</span>
              <span>{formatPrice(total)}</span>
            </div>

            {shipping > 0 && (
              <p className="free-ship-hint">
                🚚 Mua thêm{" "}
                <strong style={{ color: "var(--primary)" }}>
                  {formatPrice(500000 - subtotal)}
                </strong>{" "}
                để miễn phí vận chuyển
              </p>
            )}

            {/* Nút tiến hành thanh toán – navigate đúng sang CheckoutPage */}
            <button
              className="btn-primary"
              style={{ width: "100%", padding: "16px 0", marginTop: 20, fontSize: 16 }}
              onClick={() => navigate("checkout")}
            >
              Tiến hành thanh toán →
            </button>

            <button
              className="btn-outline"
              style={{ width: "100%", padding: "12px 0", marginTop: 10, fontSize: 14 }}
              onClick={() => navigate("products")}
            >
              ← Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CartPage;
