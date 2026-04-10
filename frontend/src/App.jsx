// =====================================================
// App.jsx – Component gốc
// Quản lý:
//   - Điều hướng giữa các trang (dùng state thay react-router)
//   - Giỏ hàng (cart)
//   - Thông báo toast
// =====================================================

import { useState, useEffect } from "react";

// Import components dùng chung
import Navbar  from "./components/Navbar";
import Footer  from "./components/Footer";
import Toast   from "./components/Toast";

// Import các trang
import HomePage          from "./pages/HomePage";
import ProductsPage      from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage          from "./pages/CartPage";
import AboutPage         from "./pages/AboutPage";
import ContactPage       from "./pages/ContactPage";

// Import CSS
import "./styles/global.css";

const App = () => {
  // ===== STATE ĐIỀU HƯỚNG =====
  const [currentPage, setCurrentPage] = useState("home");
  // Lưu sản phẩm đang xem chi tiết
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ===== STATE GIỎ HÀNG =====
  // cart là mảng: [{ product: {...}, qty: 2 }, ...]
  const [cart, setCart] = useState([]);

  // ===== STATE TOAST =====
  const [toast, setToast] = useState({ visible: false, message: "" });

  // Hàm hiện toast rồi tự tắt sau 2.5 giây
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2500);
  };

  // ===== HÀM CHUYỂN TRANG =====
  const navigate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" }); // cuộn lên đầu trang
  };

  // ===== HÀM XEM CHI TIẾT SẢN PHẨM =====
  const handleViewDetail = (product) => {
    setSelectedProduct(product);
    navigate("detail");
  };

  // ===== HÀM GIỎ HÀNG =====

  // Thêm vào giỏ hàng
  const handleAddToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        // Nếu đã có thì tăng số lượng
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      // Nếu chưa có thì thêm mới với qty = 1
      return [...prevCart, { product, qty: 1 }];
    });
    showToast(`✅ Đã thêm "${product.name}" vào giỏ!`);
  };

  // Cập nhật số lượng (qty = 0 thì xóa luôn)
  const handleUpdateQty = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, qty: newQty } : item
      )
    );
  };

  // Xóa khỏi giỏ hàng
  const handleRemoveFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast("🗑 Đã xóa sản phẩm khỏi giỏ hàng");
  };

  // Tổng số lượng trong giỏ
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // ===== RENDER TRANG TƯƠNG ỨNG =====
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            navigate={navigate}
            onAddToCart={handleAddToCart}
            onViewDetail={handleViewDetail}
          />
        );
      case "products":
        return (
          <ProductsPage
            onAddToCart={handleAddToCart}
            onViewDetail={handleViewDetail}
          />
        );
      case "detail":
        return selectedProduct ? (
          <ProductDetailPage
            product={selectedProduct}
            onAddToCart={handleAddToCart}
            onViewDetail={handleViewDetail}
            navigate={navigate}
          />
        ) : null;
      case "cart":
        return (
          <CartPage
            cart={cart}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemoveFromCart}
            navigate={navigate}
          />
        );
      case "about":
        return <AboutPage navigate={navigate} />;
      case "contact":
        return <ContactPage showToast={showToast} />;
      default:
        return <HomePage navigate={navigate} onAddToCart={handleAddToCart} onViewDetail={handleViewDetail} />;
    }
  };

  return (
    <div>
      {/* Navbar luôn hiển thị ở trên */}
      <Navbar
        currentPage={currentPage}
        navigate={navigate}
        cartCount={cartCount}
      />

      {/* Nội dung trang */}
      <main>
        {renderPage()}
      </main>

      {/* Footer luôn hiển thị ở dưới */}
      <Footer navigate={navigate} />

      {/* Toast thông báo */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
};

export default App;
