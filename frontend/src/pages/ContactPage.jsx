// =====================================================
// pages/ContactPage.jsx – Liên hệ: chỉ user đăng nhập gửi được
// =====================================================

import { useState, useEffect } from "react";
import { apiSendMessage, apiGetMyMessages, isLoggedIn } from "../utils/api";

const ContactPage = ({ navigate, showToast, user }) => {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [showInbox, setShowInbox] = useState(false);

  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (loggedIn) {
      loadMyMessages();
    }
  }, [loggedIn]);

  const loadMyMessages = async () => {
    try {
      const data = await apiGetMyMessages();
      setMyMessages(data || []);
    } catch (err) {
      console.error("Lỗi tải tin nhắn:", err);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.message) {
      showToast("Vui lòng nhập đầy đủ chủ đề và nội dung!");
      return;
    }
    if (!loggedIn) {
      showToast("Vui lòng đăng nhập để gửi liên hệ!");
      navigate("login");
      return;
    }
    setLoading(true);
    try {
      await apiSendMessage(form);
      setSubmitted(true);
      showToast("Gửi liên hệ thành công!");
      loadMyMessages();
    } catch (err) {
      showToast("Gửi thất bại: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ subject: "", message: "" });
    setSubmitted(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const contactItems = [
    { label: "Địa chỉ", value: "123 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh" },
    { label: "Điện thoại", value: "0901 234 567" },
    { label: "Email", value: "hello@profit.vn" },
    { label: "Giờ làm việc", value: "8:00 — 22:00 (Thứ 2 — CN)" },
  ];

  return (
    <div>
      <div className="page-hero">
        <h1>LIÊN <span>HỆ</span></h1>
        <p>Đội ngũ ProFit luôn sẵn sàng hỗ trợ bạn 24/7</p>
      </div>

      <section className="section">
        <div className="contact-layout">
          {/* Cột trái: thông tin */}
          <div>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36, letterSpacing: 2, color: "var(--white)", marginBottom: 8,
            }}>
              KẾT NỐI VỚI CHÚNG TÔI
            </h2>
            <p style={{ color: "var(--gray)", fontSize: 15, marginBottom: 36, lineHeight: 1.7 }}>
              Bạn có câu hỏi, góp ý hoặc cần tư vấn? Đội ngũ của chúng tôi luôn
              sẵn sàng lắng nghe và hỗ trợ bạn.
            </p>

            {contactItems.map((item) => (
              <div key={item.label} className="contact-item">
                <div className="contact-icon" style={{ fontSize: 18 }}>
                  {item.label === "Địa chỉ" ? "📍" :
                   item.label === "Điện thoại" ? "📞" :
                   item.label === "Email" ? "✉️" : "⏰"}
                </div>
                <div>
                  <div className="contact-label">{item.label}</div>
                  <div className="contact-value">{item.value}</div>
                </div>
              </div>
            ))}

            {/* Inbox cho user đã đăng nhập */}
            {loggedIn && myMessages.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <button
                  onClick={() => setShowInbox(!showInbox)}
                  style={{
                    background: "rgba(255,92,0,0.06)",
                    border: "1px solid rgba(255,92,0,0.15)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 16px",
                    color: "var(--primary)",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Tin nhắn của tôi ({myMessages.length})</span>
                  <span>{showInbox ? "▲" : "▼"}</span>
                </button>

                {showInbox && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {myMessages.map((msg) => (
                      <div key={msg.id} style={{
                        background: "var(--card-bg)",
                        border: `1px solid ${msg.status === "REPLIED" ? "var(--green)" : msg.status === "READ" ? "#333" : "rgba(255,92,0,0.3)"}`,
                        borderRadius: "var(--radius-md)",
                        padding: "14px 16px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>{msg.subject}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: msg.status === "REPLIED" ? "var(--green)" : msg.status === "READ" ? "var(--gray)" : "#f59e0b",
                          }}>
                            {msg.status === "REPLIED" ? "Đã phản hồi" : msg.status === "READ" ? "Đã xem" : "Chưa đọc"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--gray)", marginBottom: msg.replyContent ? 8 : 0 }}>
                          {msg.content}
                        </div>
                        {msg.replyContent && (
                          <div style={{
                            background: "rgba(16,185,129,0.08)",
                            border: "1px solid rgba(16,185,129,0.2)",
                            borderRadius: 8,
                            padding: "10px 12px",
                            marginTop: 8,
                          }}>
                            <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700, marginBottom: 4 }}>Phản hồi từ ProFit:</div>
                            <div style={{ fontSize: 12, color: "var(--white)" }}>{msg.replyContent}</div>
                            {msg.repliedAt && (
                              <div style={{ fontSize: 11, color: "var(--gray)", marginTop: 4 }}>{formatDate(msg.repliedAt)}</div>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "var(--gray)", marginTop: 6 }}>{formatDate(msg.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cột phải: form gửi liên hệ */}
          <div className="contact-form">
            {submitted ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "var(--white)", marginBottom: 12 }}>
                  GỬI THÀNH CÔNG!
                </h3>
                <p style={{ color: "var(--gray)", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
                  Cảm ơn bạn đã liên hệ. Đội ngũ ProFit sẽ phản hồi trong vòng 24 giờ.
                </p>
                <button className="btn-primary" onClick={resetForm}>
                  Gửi liên hệ khác
                </button>
              </div>
            ) : (
              <>
                <h3 style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 28, letterSpacing: 1, color: "var(--white)", marginBottom: 28,
                }}>
                  GỬI TIN NHẮN
                </h3>

                {!loggedIn ? (
                  <div style={{
                    background: "rgba(255,92,0,0.06)",
                    border: "1px solid rgba(255,92,0,0.15)",
                    borderRadius: "var(--radius-md)",
                    padding: "24px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                    <h4 style={{ color: "var(--white)", fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginBottom: 12 }}>
                      CẦN ĐĂNG NHẬP
                    </h4>
                    <p style={{ color: "var(--gray)", fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
                      Bạn cần đăng nhập để gửi tin nhắn liên hệ với đội ngũ ProFit.
                    </p>
                    <button className="btn-primary" style={{ width: "100%" }} onClick={() => navigate("login")}>
                      Đăng nhập ngay
                    </button>
                    <p style={{ color: "var(--gray)", fontSize: 13, marginTop: 12 }}>
                      Chưa có tài khoản?{" "}
                      <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 700 }}
                        onClick={() => navigate("register")}>
                        Đăng ký ngay
                      </span>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="form-label">Chủ đề *</label>
                      <input
                        className="form-input"
                        name="subject"
                        placeholder="VD: Tư vấn sản phẩm Whey Protein"
                        value={form.subject}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nội dung *</label>
                      <textarea
                        className="form-input form-textarea"
                        name="message"
                        placeholder="Viết nội dung tin nhắn của bạn..."
                        value={form.message}
                        onChange={handleChange}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ width: "100%", padding: "16px 0", fontSize: 16 }}
                      disabled={loading}
                    >
                      {loading ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <span className="spinning" style={{ display: "inline-block", width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} />
                          Đang gửi...
                        </span>
                      ) : "Gửi liên hệ ngay →"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
