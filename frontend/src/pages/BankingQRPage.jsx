// =====================================================
// pages/BankingQRPage.jsx – QR Code thanh toán ngân hàng
// =====================================================

import { useEffect, useState } from "react";
import { formatPrice } from "../utils/productHelpers";
import { apiConfirmBankingPayment, isLoggedIn } from "../utils/api";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

// THÔNG TIN NGÂN HÀNG CỦA ADMIN - CẬP NHẬT THÔNG TIN THỰC TẾ
const BANK_INFO = {
  bankName: "BIDV",
  accountNumber: "8890014407",
  accountHolder: "Le Vu Hao", // Cập nhật tên tài khoản thực
  branch: "BIDV-PGD Phù Cát",
};

const BankingQRPage = ({ order, navigate, showToast, onPlaceOrder, onClearCart }) => {
  const [step, setStep] = useState("qr"); // "qr" | "confirming" | "success"
  const [error, setError] = useState(null);

  // Chuyển đổi total sang number để tránh lỗi concatenate string
  // Backend trả về BigDecimal dạng string (VD: "70000.00")
  const paymentAmount = Number(order?.total) || Number(order?.totalAmount) || 0;
  const qrContent = `bidv:${BANK_INFO.accountNumber}?acc_name=${BANK_INFO.accountHolder}&amount=${paymentAmount}&memo=Thanh toan don hang ${order?.orderCode || ""}`;

  const handleConfirmPayment = async () => {
    if (!order?.id) {
      setError("Không tìm thấy thông tin đơn hàng");
      return;
    }

    setStep("confirming");
    setError(null);

    try {
      await apiConfirmBankingPayment(order.id);
      // Xóa giỏ hàng và thêm order vào danh sách khi xác nhận thanh toán thành công
      if (onClearCart) onClearCart();
      if (onPlaceOrder) onPlaceOrder(order);
      setStep("success");
      showToast(
        "Đã gửi yêu cầu xác nhận thanh toán. Vui lòng chờ admin xác nhận.",
      );
    } catch (err) {
      console.error("Lỗi xác nhận thanh toán:", err);
      setError(err.message || "Xác nhận thất bại. Vui lòng thử lại.");
      setStep("qr");
    }
  };

  const handleGoBack = () => {
    navigate("checkout");
  };

  // =====================================================
  // MÀN HÌNH QR CODE
  // =====================================================
  if (step === "qr") {
    return (
      <div className="section">
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 28,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              THANH TOÁN{" "}
              <span style={{ color: "var(--primary)" }}>CHUYỂN KHOẢN</span>
            </h2>
            <p style={{ color: "var(--gray)", fontSize: 14 }}>
              Quét mã QR để chuyển khoản
            </p>
          </div>

          {/* QR Code Container */}
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: 20,
              padding: 24,
              border: "1px solid #2a2a2a",
              textAlign: "center",
            }}
          >
            {/* QR Code */}
            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                display: "inline-block",
              }}
            >
              {/* Sử dụng Google Charts API để tạo QR code */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}`}
                alt="QR Code Thanh Toán"
                style={{ width: 200, height: 200, display: "block" }}
              />
            </div>

            {/* Số tiền nổi bật */}
            <div
              style={{
                background: "rgba(255,92,0,0.08)",
                border: "1px solid rgba(255,92,0,0.2)",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 20,
              }}
            >
              <div
                style={{ fontSize: 13, color: "var(--gray)", marginBottom: 4 }}
              >
                Số tiền cần chuyển
              </div>
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 36,
                  color: "var(--primary)",
                  letterSpacing: 1,
                }}
              >
                {formatPrice(paymentAmount)}
              </div>
              <div style={{ fontSize: 12, color: "var(--gray)", marginTop: 4 }}>
                Mã đơn:{" "}
                <strong style={{ color: "var(--white)" }}>
                  {order?.orderCode || ""}
                </strong>
              </div>
            </div>

            {/* Thông tin tài khoản */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--white)",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🏦</span> Thông tin tài khoản
              </div>
              {[
                { label: "Ngân hàng", value: BANK_INFO.bankName },
                { label: "Số tài khoản", value: BANK_INFO.accountNumber },
                { label: "Tên tài khoản", value: BANK_INFO.accountHolder },
                { label: "Chi nhánh", value: BANK_INFO.branch },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "var(--gray)" }}>{label}</span>
                  <span style={{ color: "var(--white)", fontWeight: 600 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Hướng dẫn */}
            <div
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 24,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <AlertCircle
                  size={18}
                  color="var(--amber)"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--gray)",
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: "var(--amber)" }}>Lưu ý:</strong> Vui
                  lòng chuyển khoản đúng số tiền và nội dung ghi chú để admin
                  xác nhận nhanh chóng.
                </div>
              </div>
            </div>

            {/* Nút bấm */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "16px 0",
                  fontSize: 16,
                  fontWeight: 700,
                }}
                onClick={handleConfirmPayment}
              >
                ✓ Đã thanh toán online qua ngân hàng
              </button>
              <button
                className="btn-outline"
                style={{
                  width: "100%",
                  padding: "14px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onClick={handleGoBack}
              >
                <ArrowLeft size={18} /> Quay lại
              </button>
            </div>
          </div>

          {/* Footer */}
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--gray)",
              marginTop: 20,
            }}
          >
            Sau khi chuyển khoản, vui lòng nhấn "Đã thanh toán" để thông báo cho
            admin
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MÀN HÌNH ĐANG XỬ LÝ
  // =====================================================
  if (step === "confirming") {
    return (
      <div className="section">
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <Loader2
            size={64}
            color="var(--primary)"
            className="spinning"
            style={{ margin: "0 auto 24px" }}
          />
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 32,
              marginBottom: 12,
            }}
          >
            ĐANG XỬ LÝ...
          </h2>
          <p style={{ color: "var(--gray)" }}>Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MÀN HÌNH THÀNH CÔNG
  // =====================================================
  if (step === "success") {
    return (
      <div className="section">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ marginBottom: 24 }}>
            <CheckCircle
              size={80}
              color="var(--green)"
              style={{ margin: "0 auto" }}
            />
          </div>

          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 42,
              color: "var(--green)",
              marginBottom: 16,
            }}
          >
            ĐÃ THANH TOÁN THÀNH CÔNG!
          </h2>

          <p style={{ color: "var(--gray)", fontSize: 16, marginBottom: 8 }}>
            Cảm ơn bạn đã chuyển khoản.
          </p>

          <p
            style={{
              color: "var(--amber)",
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 32,
            }}
          >
            Vui lòng chờ xác nhận của admin để hoàn tất đơn hàng.
          </p>

          {order && (
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: 16,
                padding: 20,
                marginBottom: 32,
                display: "inline-block",
                textAlign: "left",
                border: "1px solid #2a2a2a",
              }}
            >
              <div
                style={{ fontSize: 13, color: "var(--gray)", marginBottom: 12 }}
              >
                Thông tin đơn hàng
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 40,
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--gray)" }}>Mã đơn hàng</span>
                  <span style={{ color: "var(--white)", fontWeight: 700 }}>
                    {order.orderCode}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 40,
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--gray)" }}>Số tiền</span>
                  <span
                    style={{
                      color: "var(--primary)",
                      fontWeight: 700,
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 20,
                    }}
                  >
                    {formatPrice(Number(order.total) || Number(order.totalAmount) || 0)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 40,
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--gray)" }}>Trạng thái</span>
                  <span style={{ color: "var(--amber)", fontWeight: 700 }}>
                    Chờ xác nhận
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
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
      </div>
    );
  }

  return null;
};

export default BankingQRPage;
