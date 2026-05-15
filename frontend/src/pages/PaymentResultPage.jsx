// =====================================================
// pages/PaymentResultPage.jsx – Trang hiển thị kết quả thanh toán VNPay
// =====================================================

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const PaymentResultPage = ({ navigate }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Đọc kết quả từ URL query params
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const message = params.get("message");
    const orderCode = params.get("orderCode");

    // Xóa pending order data trong sessionStorage
    sessionStorage.removeItem("pendingOrderId");
    sessionStorage.removeItem("pendingOrderCode");
    sessionStorage.removeItem("pendingPayMethod");

    // Xóa query params khỏi URL (để user không refresh lại)
    window.history.replaceState({}, "", window.location.pathname);

    setResult({
      status: status === "success" ? "success" : status === "error" ? "error" : "failed",
      message: message || (status === "success" ? "Thanh toán thành công!" : "Thanh toán thất bại!"),
      orderCode: orderCode || null,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="section">
        <div className="empty-state">
          <Loader2 size={48} color="var(--primary)" className="spinning" />
          <h2 style={{ marginBottom: 10 }}>Đang xử lý...</h2>
        </div>
      </div>
    );
  }

  const isSuccess = result.status === "success";

  return (
    <div>
      <div className="page-hero">
        <h1>
          KẾT QUẢ <span>THANH TOÁN</span>
        </h1>
        <p>ProFit Supplements</p>
      </div>

      <section className="section">
        <div style={{
          maxWidth: 520,
          margin: "0 auto",
          textAlign: "center",
          padding: "60px 20px",
        }}>
          {/* Icon */}
          <div style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: isSuccess ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            {isSuccess ? (
              <CheckCircle size={56} color="var(--green)" />
            ) : (
              <XCircle size={56} color="var(--red)" />
            )}
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 36,
            color: isSuccess ? "var(--green)" : "var(--red)",
            marginBottom: 12,
          }}>
            {isSuccess ? "THANH TOÁN THÀNH CÔNG!" : "THANH TOÁN THẤT BẠI!"}
          </h2>

          {/* Message */}
          <p style={{
            color: "var(--gray)",
            fontSize: 16,
            marginBottom: 20,
            lineHeight: 1.6,
          }}>
            {result.message}
          </p>

          {/* Order code */}
          {result.orderCode && (
            <div style={{
              background: "var(--card-bg)",
              border: "1px solid #2a2a2a",
              borderRadius: 12,
              padding: "16px 24px",
              marginBottom: 32,
              display: "inline-block",
            }}>
              <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 4 }}>
                Mã đơn hàng
              </div>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 22,
                color: "var(--white)",
                letterSpacing: 2,
              }}>
                {result.orderCode}
              </div>
            </div>
          )}

          {/* Info */}
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            padding: 20,
            marginBottom: 32,
            textAlign: "left",
          }}>
            <h4 style={{ marginTop: 0, marginBottom: 12, color: "var(--white)" }}>
              Thông tin đơn hàng
            </h4>
            <div style={{ color: "var(--gray)", fontSize: 14, lineHeight: 1.8 }}>
              {isSuccess ? (
                <>
                  <p style={{ margin: "0 0 8px" }}>
                    Cảm ơn bạn đã thanh toán! Đơn hàng của bạn đã được xác nhận và đang trong quá trình xử lý.
                  </p>
                  <p style={{ margin: 0 }}>
                    Chúng tôi sẽ giao hàng trong thời gian sớm nhất. Bạn có thể theo dõi đơn hàng trong mục "Đơn hàng của tôi".
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 8px" }}>
                    Rất tiếc, thanh toán của bạn không thành công.
                  </p>
                  <p style={{ margin: 0 }}>
                    Vui lòng thử lại hoặc chọn phương thức thanh toán khác. Nếu cần hỗ trợ, hãy liên hệ với chúng tôi.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              style={{ padding: "14px 32px" }}
              onClick={() => navigate("orders")}
            >
              Xem đơn hàng
            </button>
            <button
              className="btn-outline"
              style={{ padding: "14px 32px" }}
              onClick={() => navigate("home")}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PaymentResultPage;
