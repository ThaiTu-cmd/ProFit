// =====================================================
// pages/ContactPage.jsx – Liên hệ Premium
// =====================================================

import { useState } from "react";

const ContactPage = ({ navigate, showToast }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      showToast("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      showToast("Gửi liên hệ thành công!");
    }, 1200);
  };

  const contactItems = [
    {
      icon: "📍",
      label: "Địa chỉ",
      value: "123 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh",
    },
    {
      icon: "📞",
      label: "Điện thoại",
      value: "0901 234 567",
    },
    {
      icon: "✉️",
      label: "Email",
      value: "hello@profit.vn",
    },
    {
      icon: "⏰",
      label: "Giờ làm việc",
      value: "8:00 — 22:00 (Thứ 2 — CN)",
    },
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
              fontSize: 36,
              letterSpacing: 2,
              color: "var(--white)",
              marginBottom: 8,
            }}>
              KẾT NỐI VỚI CHÚNG TÔI
            </h2>
            <p style={{ color: "var(--gray)", fontSize: 15, marginBottom: 36, lineHeight: 1.7 }}>
              Bạn có câu hỏi, góp ý hoặc cần tư vấn? Đội ngũ của chúng tôi luôn
              sẵn sàng lắng nghe và hỗ trợ bạn.
            </p>

            {contactItems.map((item) => (
              <div key={item.label} className="contact-item">
                <div className="contact-icon">{item.icon}</div>
                <div>
                  <div className="contact-label">{item.label}</div>
                  <div className="contact-value">{item.value}</div>
                </div>
              </div>
            ))}

            {/* Social */}
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 13, color: "var(--gray)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>
                Theo dõi chúng tôi
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { icon: "📘", label: "Facebook" },
                  { icon: "📸", label: "Instagram" },
                  { icon: "▶️", label: "YouTube" },
                  { icon: "💬", label: "Zalo" },
                ].map((s) => (
                  <div key={s.label} className="social-btn" title={s.label}>
                    {s.icon}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cột phải: form */}
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
                <button className="btn-primary" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}>
                  Gửi liên hệ khác
                </button>
              </div>
            ) : (
              <>
                <h3 style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 28,
                  letterSpacing: 1,
                  color: "var(--white)",
                  marginBottom: 28,
                }}>
                  GỬI TIN NHẮN
                </h3>

                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Họ và tên *</label>
                      <input className="form-input" name="name" placeholder="Nguyễn Văn A"
                        value={form.name} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input className="form-input" type="email" name="email" placeholder="email@example.com"
                        value={form.email} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Số điện thoại</label>
                      <input className="form-input" name="phone" placeholder="0901 234 567"
                        value={form.phone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Chủ đề</label>
                      <input className="form-input" name="subject" placeholder="Tư vấn sản phẩm"
                        value={form.subject} onChange={handleChange} />
                    </div>
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
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
