// =====================================================
// pages/ContactPage.jsx – Trang liên hệ
// =====================================================

import { useState } from "react";
import { MapPin, Phone, Mail, ThumbsUp } from "lucide-react";

const ContactPage = ({ showToast }) => {
  // State form
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  // Cập nhật giá trị khi người dùng gõ
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Xử lý gửi form (giả lập – chưa kết nối backend)
  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message) {
      showToast("⚠️ Vui lòng điền đầy đủ thông tin!");
      return;
    }
    showToast("✅ Gửi thành công! Chúng tôi sẽ liên hệ sớm.");
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div>
      {/* Tiêu đề */}
      <div className="page-hero">
        <h1>LIÊN <span>HỆ</span></h1>
        <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
      </div>

      <section className="section">
        <div className="contact-layout">
          {/* ===== THÔNG TIN LIÊN HỆ ===== */}
          <div className="contact-info">
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, marginBottom: 24, color: "var(--white)" }}>
              THÔNG TIN LIÊN HỆ
            </h3>

            {[
              { icon: <MapPin size={24} color="var(--primary)" />, label: "Địa chỉ", value: "123 Nguyễn Đình Chiểu, Quận 3, TP. HCM" },
              { icon: <Phone size={24} color="var(--primary)" />, label: "Hotline", value: "0901 234 567 (8:00 – 22:00)" },
              { icon: <Mail size={24} color="var(--primary)" />, label: "Email", value: "hello@powerfuel.vn" },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>, label: "Facebook", value: "fb.com/powerfuel.vn" },
            ].map((info) => (
              <div className="contact-item" key={info.label}>
                <div className="contact-icon">{info.icon}</div>
                <div>
                  <div className="contact-label">{info.label}</div>
                  <div className="contact-value">{info.value}</div>
                </div>
              </div>
            ))}

            {/* Giờ làm việc */}
            <div className="working-hours">
              <h4>Giờ làm việc</h4>
              <div className="hours-row"><span>Thứ 2 – Thứ 6</span><span>8:00 – 22:00</span></div>
              <div className="hours-row"><span>Thứ 7 – Chủ nhật</span><span>9:00 – 20:00</span></div>
            </div>
          </div>

          {/* ===== FORM LIÊN HỆ ===== */}
          <div className="contact-form">
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, marginBottom: 24, color: "var(--white)" }}>
              GỬI TIN NHẮN
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input
                  className="form-input"
                  type="text"
                  name="name"
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input
                  className="form-input"
                  type="tel"
                  name="phone"
                  placeholder="0901 234 567"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tin nhắn *</label>
              <textarea
                className="form-input form-textarea"
                name="message"
                placeholder="Tôi cần tư vấn về sản phẩm..."
                value={form.message}
                onChange={handleChange}
              />
            </div>

            <button className="btn-primary" style={{ width: "100%", padding: "14px 0", fontSize: 16 }} onClick={handleSubmit}>
              Gửi tin nhắn ✉️
            </button>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">CÂU HỎI <span>THƯỜNG GẶP</span></h2>
        </div>
        <div className="faq-list">
          {[
            {
              q: "Sản phẩm có chính hãng không?",
              a: "100% sản phẩm được nhập khẩu trực tiếp từ nhà sản xuất hoặc nhà phân phối chính thức. Mỗi sản phẩm đều có tem chống hàng giả và có thể kiểm tra trên website của hãng.",
            },
            {
              q: "Chính sách đổi trả như thế nào?",
              a: "Chúng tôi hỗ trợ đổi trả trong vòng 7 ngày nếu sản phẩm bị lỗi do nhà sản xuất, hàng sai so với đơn đặt hoặc bị hư hỏng trong quá trình vận chuyển.",
            },
            {
              q: "Giao hàng mất bao lâu?",
              a: "Tại TP.HCM: 2–4 giờ (đơn trong giờ hành chính). Các tỉnh thành khác: 1–3 ngày làm việc.",
            },
            {
              q: "Tôi cần tư vấn sản phẩm phù hợp thì làm sao?",
              a: "Bạn có thể nhắn tin Facebook, gọi hotline hoặc để lại tin nhắn qua form này. Chuyên gia dinh dưỡng của chúng tôi sẽ tư vấn miễn phí và đề xuất sản phẩm phù hợp với mục tiêu của bạn.",
            },
          ].map((item, index) => (
            <FaqItem key={index} question={item.q} answer={item.a} />
          ))}
        </div>
      </section>
    </div>
  );
};

// Component con: một câu hỏi FAQ có thể mở/đóng
const FaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <span className="faq-icon">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="faq-answer">{answer}</div>}
    </div>
  );
};

export default ContactPage;
