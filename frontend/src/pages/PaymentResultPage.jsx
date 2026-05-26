// =====================================================
// pages/PaymentResultPage.jsx – Xử lý kết quả từ VNPay
// Backend redirect về: /payment-result?status=success&message=...&orderCode=...
// =====================================================

import { useEffect, useState } from "react";

const PaymentResultPage = ({ navigate, onPlaceOrder }) => {
  const [status, setStatus] = useState("loading");
  const [orderCode, setOrderCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status");
    const orderCodeParam = params.get("orderCode");
    const messageParam = params.get("message");

    if (!statusParam) {
      navigate("home");
      return;
    }

    setStatus(statusParam);
    setOrderCode(orderCodeParam || "");
    setMessage(messageParam ? decodeURIComponent(messageParam) : "");

    if (statusParam === "success") {
      localStorage.removeItem("cart");
      const pendingRaw = localStorage.getItem("pendingVnpayOrder");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          localStorage.removeItem("pendingVnpayOrder");
          if (onPlaceOrder) onPlaceOrder(pending);
        } catch { /* ignore */ }
      }
    }

    // Dọn query string
    window.history.replaceState({}, "", "/payment-result");
  }, []);

  if (status === "loading") {
    return (
      <div className="section" style={{ textAlign: "center", padding: "80px 60px" }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>⏳</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: "var(--white)", marginBottom: 16 }}>
          ĐANG XỬ LÝ THANH TOÁN...
        </h1>
        <p style={{ color: "var(--gray)" }}>Vui lòng chờ trong giây lát.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="section" style={{ textAlign: "center", padding: "80px 60px" }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: "var(--green)", marginBottom: 12 }}>
          THANH TOÁN THÀNH CÔNG!
        </h1>
        {orderCode && (
          <p style={{ color: "var(--gray)", fontSize: 14, marginBottom: 8 }}>
            Mã đơn: <strong style={{ color: "var(--white)" }}>{orderCode}</strong>
          </p>
        )}
        <p style={{ color: "var(--gray)", fontSize: 16, marginBottom: 36 }}>
          Cảm ơn bạn đã thanh toán qua VNPay. Đơn hàng của bạn đang được xử lý.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button className="btn-primary" style={{ padding: "14px 32px" }} onClick={() => navigate("orders")}>
            Xem đơn hàng
          </button>
          <button className="btn-outline" style={{ padding: "14px 32px" }} onClick={() => navigate("home")}>
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="section" style={{ textAlign: "center", padding: "80px 60px" }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>⚠️</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: "var(--amber)", marginBottom: 12 }}>
          LỖI XÁC THỰC
        </h1>
        <p style={{ color: "var(--gray)", fontSize: 16, marginBottom: 36 }}>
          {message || "Chữ ký thanh toán không hợp lệ."}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button className="btn-outline" style={{ padding: "14px 32px" }} onClick={() => navigate("checkout")}>
            Thử lại thanh toán
          </button>
          <button className="btn-primary" style={{ padding: "14px 32px" }} onClick={() => navigate("home")}>
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section" style={{ textAlign: "center", padding: "80px 60px" }}>
      <div style={{ fontSize: 80, marginBottom: 24 }}>❌</div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: "var(--red)", marginBottom: 12 }}>
        THANH TOÁN THẤT BẠI
      </h1>
      {message && (
        <p style={{ color: "var(--gray)", fontSize: 14, marginBottom: 8 }}>{message}</p>
      )}
      <p style={{ color: "var(--gray)", fontSize: 16, marginBottom: 36 }}>
        Thanh toán qua VNPay không thành công. Bạn có thể thử lại hoặc chọn phương thức khác.
      </p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <button className="btn-outline" style={{ padding: "14px 32px" }} onClick={() => navigate("checkout")}>
          Thử lại thanh toán
        </button>
        <button className="btn-primary" style={{ padding: "14px 32px" }} onClick={() => navigate("home")}>
          Về trang chủ
        </button>
      </div>
    </div>
  );
};

export default PaymentResultPage;
