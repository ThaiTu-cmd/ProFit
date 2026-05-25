// =====================================================
// pages/LoginPage.jsx – Trang đăng nhập Premium
// =====================================================

import { useState } from "react";
import { apiLogin } from "../utils/api";
import ForgotPasswordModal from "../components/ForgotPasswordModal";

const LoginPage = ({ onLogin, navigate }) => {
  const [form, setForm] = useState({ email: "admin@profit.com", password: "Admin@123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiLogin(form.email, form.password);

      localStorage.setItem("token", data.token);

      const userData = {
        email: data.username || form.email,
        role: data.role ? data.role.toLowerCase() : "user",
        token: data.token,
        name: data.fullName || data.name || data.username?.split('@')[0] || "",
        phone: data.phone || "",
      };

      localStorage.setItem("user", JSON.stringify(userData));
      onLogin(userData);

      if (userData.role === "admin") {
        navigate("admin-dashboard");
      } else {
        navigate("home");
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8080/ProFitSuppsDB/oauth2/authorization/google";
  };

  const inputStyle = (focused, extra = {}) => ({
    width: "100%",
    padding: "14px 18px",
    paddingRight: 48,
    borderRadius: "var(--radius-lg)",
    border: focused
      ? "1px solid rgba(255,92,0,0.5)"
      : "1px solid rgba(255,255,255,0.06)",
    background: "rgba(7, 9, 15, 0.5)",
    color: "var(--white)",
    fontSize: 15,
    fontFamily: "'Nunito', sans-serif",
    outline: "none",
    transition: "all 0.35s",
    boxShadow: focused ? "0 0 0 3px rgba(255,92,0,0.1), 0 0 24px rgba(255,92,0,0.06)" : "none",
    ...extra,
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        position: "relative",
        zIndex: 10,
      }}
    >
      {showForgot && (
        <ForgotPasswordModal
          onClose={() => setShowForgot(false)}
          onSwitch={() => setShowForgot(false)}
        />
      )}

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 600, height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,92,0,0.08) 0%, transparent 70%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }} />

      <div className="auth-card" style={{ position: "relative", zIndex: 1 }}>
        {/* Glow accent top */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 3,
          background: "linear-gradient(90deg, transparent, var(--primary), rgba(139,92,246,0.8), var(--primary), transparent)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        }} />

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 36,
            color: "var(--primary)",
            letterSpacing: 3,
            textShadow: "0 0 20px rgba(255,92,0,0.3)",
            marginBottom: 8,
          }}>
            Pro<span style={{ color: "var(--white)" }}>Fit</span>
          </div>
          <p style={{ color: "var(--gray)", fontSize: 14, fontWeight: 600 }}>
            Chào mừng bạn quay trở lại
          </p>
        </div>

        {/* Demo hint */}
        <div className="demo-hint">
          Demo: <strong style={{ color: "var(--primary)" }}>admin@profit.com</strong> / <strong style={{ color: "var(--primary)" }}>Admin@123</strong>
        </div>

        {/* Form */}
        <div style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label" style={{ display: "block", marginBottom: 10 }}>Email</label>
            <FocusedInput
              type="email"
              name="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: "block", marginBottom: 10 }}>Mật khẩu</label>
            <div style={{ position: "relative" }}>
              <FocusedInput
                type={showPass ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                style={(focused) => inputStyle(focused, { paddingRight: 48 })}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: 14, top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none",
                  color: "var(--gray)", fontSize: 18, cursor: "pointer",
                  transition: "color 0.3s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--gray)"}
              >
                {showPass ? "👁" : "👁‍🗨"}
              </button>
            </div>
          </div>
        </div>

        {/* Quên mật khẩu */}
        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <span
            style={{ fontSize: 13, color: "var(--primary)", cursor: "pointer", fontWeight: 700, transition: "opacity 0.3s" }}
            onClick={() => setShowForgot(true)}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Quên mật khẩu?
          </span>
        </div>

        {/* Lỗi */}
        {error && (
          <div className="auth-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Nút đăng nhập */}
        <button
          className="btn-primary"
          style={{ width: "100%", padding: "16px 0", fontSize: 16, position: "relative", overflow: "hidden" }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span className="spinning" style={{ display: "inline-block", width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} />
              Đang đăng nhập...
            </span>
          ) : "Đăng nhập ngay"}
        </button>

        {/* Divider */}
        <div className="auth-divider"><span>hoặc</span></div>

        {/* Google button */}
        <button
          style={{
            width: "100%", padding: "14px 0",
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--white)", fontSize: 15, fontWeight: 700,
            cursor: "pointer", transition: "all 0.3s",
            fontFamily: "'Nunito', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
          onClick={handleGoogleLogin}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Đăng nhập với Google
        </button>

        {/* Chuyển sang đăng ký */}
        <div style={{ textAlign: "center", fontSize: 14, color: "var(--gray)", marginTop: 24 }}>
          Chưa có tài khoản?{" "}
          <span
            style={{ color: "var(--primary)", fontWeight: 800, cursor: "pointer", transition: "opacity 0.3s" }}
            onClick={() => navigate("register")}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Đăng ký ngay
          </span>
        </div>
      </div>
    </div>
  );
};

// ── FocusedInput: input tự động bắt focus highlight ──
const FocusedInput = ({ style, ...props }) => {
  const [focused, setFocused] = useState(false);
  const resolvedStyle = typeof style === "function" ? style(focused) : { ...style };
  return (
    <input
      {...props}
      style={resolvedStyle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

export default LoginPage;
