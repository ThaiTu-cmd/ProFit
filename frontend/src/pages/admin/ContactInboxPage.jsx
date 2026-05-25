import { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
};

const ContactInboxPage = ({ showToast }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllMessages();
      setMessages(data || []);
    } catch (err) {
      showToast(`Lỗi tải tin nhắn: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSelect = async (msg) => {
    setSelected(msg);
    setReplyText(msg.replyContent || "");
    if (msg.status === "UNREAD") {
      try {
        await adminService.markMessageRead(msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "READ" } : m));
      } catch (err) {
        console.error("Mark read error:", err);
      }
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) { showToast("Vui lòng nhập nội dung phản hồi!"); return; }
    if (!selected) return;
    setSending(true);
    try {
      const updated = await adminService.replyMessage(selected.id, { replyContent: replyText });
      setMessages(prev => prev.map(m => m.id === selected.id ? updated : m));
      setSelected(updated);
      showToast("Phản hồi đã gửi!");
    } catch (err) {
      showToast(`Lỗi gửi phản hồi: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const filtered = messages.filter(m => {
    if (filter === "all") return true;
    if (filter === "unread") return m.status === "UNREAD";
    if (filter === "replied") return m.status === "REPLIED";
    return true;
  });

  const unreadCount = messages.filter(m => m.status === "UNREAD").length;

  return (
    <div className="section">
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 2 }}>
            HỘP THƯ <span style={{ color: "var(--primary)" }}>LIÊN HỆ</span>
          </h2>
          <p style={{ color: "var(--gray)", fontSize: 14, marginTop: 4 }}>
            {unreadCount > 0 ? `${unreadCount} tin nhắn chưa đọc` : "Tất cả tin nhắn đã được xử lý"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "unread", "replied"].map(f => (
            <button key={f}
              className={`order-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}>
              {f === "all" ? "Tất cả" : f === "unread" ? "Chưa đọc" : "Đã phản hồi"}
              {f === "unread" && unreadCount > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: "var(--primary)", color: "white", padding: "2px 7px", borderRadius: 10 }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, minHeight: 520 }}>
        {/* Danh sách tin nhắn */}
        <div style={{ background: "var(--card-bg)", borderRadius: 14, border: "1px solid #2a2a2a", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #2a2a2a" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gray)", textTransform: "uppercase", letterSpacing: 1 }}>
              Tin nhắn ({filtered.length})
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--gray)" }}>Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--gray)" }}>Không có tin nhắn nào</div>
          ) : (
            <div style={{ maxHeight: 460, overflowY: "auto" }}>
              {filtered.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  style={{
                    padding: "14px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid #1a1a1a",
                    background: selected?.id === msg.id ? "rgba(255,92,0,0.08)" : "transparent",
                    borderLeft: selected?.id === msg.id ? "3px solid var(--primary)" : "3px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--white)", flex: 1 }}>
                      {msg.subject}
                    </span>
                    {msg.status === "UNREAD" && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, marginLeft: 8 }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gray)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {msg.userFullName} — {msg.userEmail}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gray)" }}>
                    {formatDate(msg.createdAt)}
                    {msg.status === "REPLIED" && (
                      <span style={{ marginLeft: 8, color: "var(--green)" }}>✓ Đã phản hồi</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chi tiết & reply */}
        <div style={{ background: "var(--card-bg)", borderRadius: 14, border: "1px solid #2a2a2a", display: "flex", flexDirection: "column" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray)" }}>
              Chọn một tin nhắn để xem chi tiết
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #2a2a2a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--white)", margin: 0 }}>
                    {selected.subject}
                  </h3>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: selected.status === "REPLIED" ? "var(--green)" : selected.status === "UNREAD" ? "var(--primary)" : "var(--gray)",
                    border: `1px solid ${selected.status === "REPLIED" ? "var(--green)" : selected.status === "UNREAD" ? "var(--primary)" : "#333"}`,
                    padding: "4px 12px", borderRadius: 6,
                  }}>
                    {selected.status === "REPLIED" ? "Đã phản hồi" : selected.status === "UNREAD" ? "Chưa đọc" : "Đã xem"}
                  </span>
                </div>
                {/* User info */}
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8, padding: "12px 16px",
                  display: "flex", gap: 24,
                }}>
                  {[
                    { label: "Khách hàng", value: selected.userFullName },
                    { label: "Email", value: selected.userEmail },
                    { label: "Điện thoại", value: selected.userPhone || "—" },
                    { label: "Gửi lúc", value: formatDate(selected.createdAt) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: "var(--gray)", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--white)" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nội dung user gửi */}
              <div style={{ padding: "20px 24px", flex: 1 }}>
                <div style={{ fontSize: 13, color: "var(--gray)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Nội dung tin nhắn
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "16px", marginBottom: 20, lineHeight: 1.7, color: "var(--white)", fontSize: 14 }}>
                  {selected.content}
                </div>

                {/* Phản hồi đã gửi */}
                {selected.replyContent && (
                  <>
                    <div style={{ fontSize: 13, color: "var(--green)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                      Phản hồi của bạn {selected.repliedAt && `(Đã gửi lúc ${formatDate(selected.repliedAt)})`}
                    </div>
                    <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "16px", lineHeight: 1.7, color: "var(--white)", fontSize: 14 }}>
                      {selected.replyContent}
                    </div>
                  </>
                )}

                {/* Form phản hồi */}
                {selected.status !== "REPLIED" && (
                  <>
                    <div style={{ fontSize: 13, color: "var(--primary)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 16 }}>
                      Phản hồi
                    </div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Nhập nội dung phản hồi cho khách hàng..."
                      style={{
                        width: "100%", minHeight: 120,
                        background: "rgba(7,9,15,0.5)",
                        border: "1px solid rgba(255,92,0,0.3)",
                        borderRadius: 8, padding: 14,
                        color: "var(--white)", fontSize: 14,
                        fontFamily: "'Nunito', sans-serif",
                        resize: "vertical", outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      className="btn-primary"
                      style={{ marginTop: 12, padding: "12px 28px", fontSize: 14 }}
                      onClick={handleSendReply}
                      disabled={sending}
                    >
                      {sending ? "Đang gửi..." : "Gửi phản hồi"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactInboxPage;
