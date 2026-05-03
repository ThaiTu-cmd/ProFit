// =====================================================
// pages/ProfilePage.jsx – Trang quản lý thông tin cá nhân
// Props: navigate, user, onUserUpdate
// =====================================================

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/apiConfig";
import { Loader } from "lucide-react";

const DEFAULT_USER_INFO = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  district: "",
  city: "",
  note: "",
};

const ProfilePage = ({ navigate, user, onUserUpdate }) => {
  const [form, setForm] = useState(DEFAULT_USER_INFO);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Nạp thông tin: ưu tiên từ API, fallback localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) return;

    setLoading(true);
    fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const storageKey = `userInfo_${user.email}`;
          const savedInfo = localStorage.getItem(storageKey);
          const local = savedInfo ? JSON.parse(savedInfo) : {};

          setForm({
            ...DEFAULT_USER_INFO,
            fullName: data.fullName || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            address: local.address || "",
            district: local.district || "",
            city: local.city || "",
            note: local.note || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveToLocal = () => {
    const storageKey = user ? `userInfo_${user.email}` : "userInfo";
    localStorage.setItem(storageKey, JSON.stringify({
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      address: form.address,
      district: form.district,
      city: form.city,
      note: form.note,
    }));
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || !form.phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token || !user) {
      saveToLocal();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cập nhật thất bại");

      if (onUserUpdate && data.fullName) {
        onUserUpdate({ ...user, name: data.fullName, phone: data.phone });
      }

      saveToLocal();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-hero">
        <h1>
          THÔNG TIN <span>CÁ NHÂN</span>
        </h1>
        <p>Lưu thông tin để lần sau đặt hàng không cần nhập lại</p>
      </div>

      <section className="section">
        <div className="checkout-card" style={{ maxWidth: 860, margin: "0 auto" }}>
          <h3 className="checkout-card-title">👤 Hồ sơ giao hàng</h3>

          {loading && (
            <div style={{ textAlign: "center", padding: 20 }}>
              <Loader size={24} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          )}

          {error && (
            <div style={{ color: "var(--red)", fontSize: 14, marginBottom: 12 }}>{error}</div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Họ và tên *</label>
              <input
                className="form-input"
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại *</label>
              <input
                className="form-input"
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              name="email"
              value={form.email}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Địa chỉ</label>
            <input
              className="form-input"
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quận / Huyện</label>
              <input
                className="form-input"
                type="text"
                name="district"
                value={form.district}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tỉnh / Thành phố</label>
              <input
                className="form-input"
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú mặc định</label>
            <textarea
              className="form-input form-textarea"
              name="note"
              value={form.note}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu thông tin"}
            </button>

            <button className="btn-outline" onClick={() => navigate("checkout")}>
              Sang thanh toán
            </button>

            <button className="btn-outline" onClick={() => navigate("home")}>
              Về trang chủ
            </button>
          </div>

          {saved && (
            <div style={{ marginTop: 16, color: "var(--green)", fontSize: 14, fontWeight: 600 }}>
              ✅ Đã lưu thông tin thành công
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
