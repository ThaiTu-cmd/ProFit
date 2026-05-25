import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const OAuthCallback = ({ onLogin }) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const username = params.get("username");
    const role = params.get("role");
    const fullName = params.get("fullName");
    const phone = params.get("phone");

    if (token && username) {
      const userData = {
        email: decodeURIComponent(username),
        role: (role || "customer").toLowerCase(),
        token: token,
        name: fullName ? decodeURIComponent(fullName) : username.split("@")[0],
        phone: phone || "",
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      onLogin(userData);
      navigate(userData.role === "admin" ? "/admin" : "/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>🔄</div>
      <h2 style={{ color: "var(--white)", fontFamily: "'Bebas Neue', sans-serif" }}>
        Đang đăng nhập...
      </h2>
    </div>
  );
};

export default OAuthCallback;
