// =====================================================
// pages/LoginPage.jsx – Trang đăng nhập
// Props: onLogin, navigate
// =====================================================

import { useState } from "react";

const LoginPage = ({ onLogin, navigate }) => {
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setLoading(true);
    // Giả lập gọi API – trong thực tế gọi POST /api/auth/login
    setTimeout(() => {
      setLoading(false);
      // Tài khoản demo
      if (form.email === "admin@powerfuel.vn" && form.password === "123456") {
        onLogin({ id: 1, name: "Admin", email: form.email, role: "admin" });
        navigate("admin-dashboard");
      } else if (form.email === "user@powerfuel.vn" && form.password === "123456") {
        onLogin({ id: 2, name: "Nguyễn Văn A", email: form.email, role: "user" });
        navigate("home");
      } else {
        setError("Email hoặc mật khẩu không đúng.");
      }
    }, 800);
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "var(--primary)", letterSpacing: 2 }}>
            Power<span style={{ color: "var(--white)" }}>Fuel</span>
          </div>
          <p style={{ color: "var(--gray)", fontSize: 14, marginTop: 6 }}>Đăng nhập để tiếp tục</p>
        </div>

        {/* Tài khoản demo */}
        <div className="demo-hint">
          <strong>Demo:</strong> user@powerfuel.vn / 123456 &nbsp;|&nbsp; admin@powerfuel.vn / 123456
        </div>

        {/* Form */}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" name="email" placeholder="email@example.com"
            value={form.email} onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        <div className="form-group">
          <label className="form-label">Mật khẩu</label>
          <input className="form-input" type="password" name="password" placeholder="••••••••"
            value={form.password} onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        {/* Quên mật khẩu */}
        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: "var(--primary)", cursor: "pointer" }}>Quên mật khẩu?</span>
        </div>

        {/* Lỗi */}
        {error && <div className="auth-error">{error}</div>}

        {/* Nút đăng nhập */}
        <button className="btn-primary" style={{ width: "100%", padding: "14px 0", fontSize: 15 }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        {/* Divider */}
        <div className="auth-divider"><span>hoặc</span></div>

        {/* Chuyển sang đăng ký */}
        <div style={{ textAlign: "center", fontSize: 14, color: "var(--gray)" }}>
          Chưa có tài khoản?{" "}
          <span style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
            onClick={() => navigate("register")}>
            Đăng ký ngay
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
