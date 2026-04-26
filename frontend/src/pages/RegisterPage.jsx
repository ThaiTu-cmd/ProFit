// =====================================================
// pages/RegisterPage.jsx – Trang đăng ký tài khoản
// Props: onLogin, navigate
// =====================================================

import { useState } from "react";

const RegisterPage = ({ onLogin, navigate }) => {
  const [form, setForm]   = useState({ fullName: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError("");
    const { fullName, email, phone, password, confirm } = form;

    if (!fullName || !email || !password || !confirm) {
      setError("Vui lòng điền đầy đủ thông tin."); return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự."); return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp."); return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/ProFitSuppsDB/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password_hash: password // send the raw password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Đăng ký thất bại.");
      }

      // Đăng ký thành công -> Xóa bộ nhớ và chuyển qua trang đăng nhập
      localStorage.removeItem("userInfo");
      navigate("login"); // Hoặc có thể tự động login luôn, nhưng tốt nhất bắt đăng nhập lại
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "var(--primary)", letterSpacing: 2 }}>
            Pro<span style={{ color: "var(--white)" }}>Fit</span>
          </div>
          <p style={{ color: "var(--gray)", fontSize: 14, marginTop: 6 }}>Tạo tài khoản miễn phí</p>
        </div>

        {/* Họ tên + SĐT */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Họ và tên *</label>
            <input className="form-input" name="fullName" placeholder="Nguyễn Văn A"
              value={form.fullName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input className="form-input" name="phone" placeholder="0901 234 567"
              value={form.phone} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" name="email" placeholder="email@example.com"
            value={form.email} onChange={handleChange} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Mật khẩu *</label>
            <input className="form-input" type="password" name="password" placeholder="Tối thiểu 6 ký tự"
              value={form.password} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu *</label>
            <input className="form-input" type="password" name="confirm" placeholder="Nhập lại mật khẩu"
              value={form.confirm} onChange={handleChange} />
          </div>
        </div>

        {/* Chỉ báo độ mạnh mật khẩu */}
        {form.password.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--gray)", marginBottom: 6 }}>Độ mạnh mật khẩu:</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1,2,3,4].map((i) => (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: form.password.length >= i * 3 ? (i <= 1 ? "#ef4444" : i === 2 ? "#f59e0b" : i === 3 ? "#3b82f6" : "var(--green)") : "var(--dark3)"
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Điều khoản */}
        <p style={{ fontSize: 12, color: "var(--gray)", marginBottom: 16 }}>
          Bằng cách đăng ký, bạn đồng ý với{" "}
          <span style={{ color: "var(--primary)", cursor: "pointer" }}>Điều khoản dịch vụ</span>{" "}
          và <span style={{ color: "var(--primary)", cursor: "pointer" }}>Chính sách bảo mật</span>.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn-primary" style={{ width: "100%", padding: "14px 0", fontSize: 15 }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>

        <div className="auth-divider"><span>hoặc</span></div>

        <div style={{ textAlign: "center", fontSize: 14, color: "var(--gray)" }}>
          Đã có tài khoản?{" "}
          <span style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
            onClick={() => navigate("login")}>
            Đăng nhập
          </span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
