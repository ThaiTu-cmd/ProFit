// =====================================================
// pages/admin/ProductManagePage.jsx – Quản lý sản phẩm
// Tính năng: thêm/sửa/xóa sản phẩm, theo dõi cận date
// Props: showToast
// =====================================================

import { useState } from "react";
import { products as initialProducts, categories, formatPrice } from "../../data/products";

// Tính số ngày còn đến hết hạn
const daysUntilExpiry = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Xác định badge cận date
const getExpiryBadge = (days) => {
  if (days === null) return null;
  if (days < 0)   return { text: "Hết hạn",   color: "#666",           bg: "#1a1a1a" };
  if (days <= 30) return { text: `${days}d 🔴`, color: "var(--red)",    bg: "rgba(239,68,68,0.1)" };
  if (days <= 60) return { text: `${days}d 🟠`, color: "#f97316",      bg: "rgba(249,115,22,0.1)" };
  if (days <= 90) return { text: `${days}d 🟡`, color: "#f59e0b",      bg: "rgba(245,158,11,0.1)" };
  return { text: `${days}d ✅`, color: "var(--green)", bg: "rgba(34,197,94,0.08)" };
};

const EMPTY_FORM = {
  name: "", brand: "", price: "", categoryId: 1,
  shortDesc: "", emoji: "🥛", expiryDate: "", discountPct: 0, inStock: true,
};

const ProductManagePage = ({ showToast }) => {
  const [products, setProducts]   = useState(initialProducts);
  const [search, setSearch]       = useState("");
  const [filterExpiry, setFilterExpiry] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);

  // Lọc sản phẩm
  let filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
    const matchExpiry = filterExpiry ? daysUntilExpiry(p.expiryDate) !== null && daysUntilExpiry(p.expiryDate) <= 90 : true;
    return matchSearch && matchExpiry;
  });

  const nearExpiryCount = products.filter(p => {
    const d = daysUntilExpiry(p.expiryDate);
    return d !== null && d <= 90;
  }).length;

  // Mở modal thêm mới
  const openAdd = () => { setEditProduct(null); setForm(EMPTY_FORM); setShowModal(true); };

  // Mở modal chỉnh sửa
  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ name: p.name, brand: p.brand, price: p.price, categoryId: p.categoryId,
      shortDesc: p.shortDesc, emoji: p.emoji, expiryDate: p.expiryDate ?? "", discountPct: p.discountPct ?? 0, inStock: p.inStock });
    setShowModal(true);
  };

  // Lưu sản phẩm
  const handleSave = () => {
    if (!form.name || !form.brand || !form.price) { showToast("⚠️ Vui lòng điền đầy đủ!"); return; }
    if (editProduct) {
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...form, price: Number(form.price) } : p));
      showToast("✅ Đã cập nhật sản phẩm!");
    } else {
      setProducts(prev => [...prev, { ...form, id: Date.now(), price: Number(form.price), rating: 5, reviews: 0, badge: "", oldPrice: null, flavors: [], weight: "", servings: 0 }]);
      showToast("✅ Đã thêm sản phẩm mới!");
    }
    setShowModal(false);
  };

  // Xóa sản phẩm
  const handleDelete = (id) => {
    if (!window.confirm("Xóa sản phẩm này?")) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast("🗑 Đã xóa sản phẩm!");
  };

  return (
    <div className="section">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 2 }}>
          QUẢN LÝ <span style={{ color: "var(--primary)" }}>SẢN PHẨM</span>
        </h2>
        <button className="btn-primary" style={{ padding: "12px 24px" }} onClick={openAdd}>+ Thêm sản phẩm</button>
      </div>

      {/* Banner cận date */}
      {nearExpiryCount > 0 && (
        <div className="near-expiry-banner" style={{ marginBottom: 20 }} onClick={() => setFilterExpiry(!filterExpiry)}>
          <span>🕐 {nearExpiryCount} sản phẩm cận date (≤ 90 ngày)</span>
          <span>{filterExpiry ? "Xem tất cả" : "Lọc cận date →"}</span>
        </div>
      )}

      {/* Thanh tìm kiếm */}
      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <span>🔍</span>
          <input className="search-input" placeholder="Tìm theo tên, thương hiệu..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setFilterExpiry(!filterExpiry)} style={{
          background: filterExpiry ? "var(--primary)" : "var(--dark3)", border: "1px solid " + (filterExpiry ? "var(--primary)" : "#444"),
          color: "var(--white)", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>
          🕐 Cận date {filterExpiry ? "✓" : ""}
        </button>
        <span style={{ color: "var(--gray)", fontSize: 14 }}>{filtered.length} sản phẩm</span>
      </div>

      {/* Bảng sản phẩm */}
      <div style={{ background: "var(--card-bg)", borderRadius: 16, border: "1px solid #2a2a2a", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2a2a2a", background: "var(--dark3)" }}>
              {["Sản phẩm", "Danh mục", "Giá", "Hết hạn / Giảm giá", "Tồn kho", ""].map(h => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", color: "var(--gray)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const days  = daysUntilExpiry(p.expiryDate);
              const badge = getExpiryBadge(days);
              const cat   = categories.find(c => c.id === p.categoryId);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 32 }}>{p.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--white)", marginBottom: 2 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "var(--primary)" }}>{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--gray)" }}>{cat?.name ?? "—"}</td>
                  <td style={{ padding: "14px 16px", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "var(--primary)" }}>{formatPrice(p.price)}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {badge ? (
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: badge.color, background: badge.bg, padding: "4px 10px", borderRadius: 6, border: `1px solid ${badge.color}` }}>
                          {badge.text}
                        </span>
                        {p.discountPct > 0 && (
                          <div style={{ fontSize: 12, color: "var(--gray)", marginTop: 4 }}>Giảm {p.discountPct}%</div>
                        )}
                      </div>
                    ) : <span style={{ color: "var(--gray)", fontSize: 12 }}>Chưa nhập</span>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: p.inStock ? "var(--green)" : "var(--red)" }}>
                      {p.inStock ? "Còn hàng" : "Hết hàng"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(p)} style={{ background: "var(--dark3)", border: "1px solid #444", color: "var(--white)", padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Sửa</button>
                      <button onClick={() => handleDelete(p.id)} className="btn-danger">Xóa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal thêm/sửa sản phẩm */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "var(--dark2)", borderRadius: 20, padding: 36, width: 560, border: "1px solid #333", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, marginBottom: 24, letterSpacing: 1 }}>
              {editProduct ? "CHỈNH SỬA SẢN PHẨM" : "THÊM SẢN PHẨM MỚI"}
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tên sản phẩm *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Gold Standard Whey..." />
              </div>
              <div className="form-group">
                <label className="form-label">Thương hiệu *</label>
                <input className="form-input" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Optimum Nutrition" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Giá (đ) *</label>
                <input className="form-input" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="850000" />
              </div>
              <div className="form-group">
                <label className="form-label">Emoji đại diện</label>
                <input className="form-input" value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} />
              </div>
            </div>

            {/* Phần cận date */}
            <div style={{ background: "var(--dark3)", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #333" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 12 }}>🕐 Thông tin cận date</div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ngày hết hạn</label>
                  <input className="form-input" type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Giảm giá cận date (%)</label>
                  <input className="form-input" type="number" min="0" max="70" value={form.discountPct} onChange={e => setForm({...form, discountPct: Number(e.target.value)})} placeholder="0" />
                </div>
              </div>
              {form.expiryDate && (
                <div style={{ marginTop: 10, fontSize: 13, color: "var(--gray)" }}>
                  Còn {daysUntilExpiry(form.expiryDate)} ngày đến hết hạn
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả ngắn</label>
              <input className="form-input" value={form.shortDesc} onChange={e => setForm({...form, shortDesc: e.target.value})} />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn-primary" style={{ flex: 1, padding: "13px 0" }} onClick={handleSave}>
                {editProduct ? "Lưu thay đổi" : "Thêm sản phẩm"}
              </button>
              <button className="btn-outline" style={{ flex: 1, padding: "13px 0" }} onClick={() => setShowModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagePage;
