// =====================================================
// pages/AboutPage.jsx – Trang giới thiệu công ty
// Props:
//   - navigate: chuyển trang
// =====================================================

const AboutPage = ({ navigate }) => {
  return (
    <div>
      {/* Tiêu đề */}
      <div className="page-hero">
        <h1>VỀ <span>CHÚNG TÔI</span></h1>
        <p>Hành trình xây dựng cộng đồng thể thao khỏe mạnh tại Việt Nam</p>
      </div>

      {/* ===== GIỚI THIỆU ===== */}
      <section className="section">
        <div className="about-layout">
          <div className="about-text">
            <h2 className="section-title" style={{ fontSize: 36, marginBottom: 20 }}>
              CÂU CHUYỆN <span>CỦA CHÚNG TÔI</span>
            </h2>
            <p style={{ color: "var(--gray)", fontSize: 16, lineHeight: 1.8, marginBottom: 16 }}>
              PowerFuel được thành lập vào năm 2019 bởi những người yêu thể thao với mục tiêu
              mang đến thực phẩm bổ sung chính hãng, chất lượng cao với giá hợp lý cho cộng đồng
              thể thao Việt Nam.
            </p>
            <p style={{ color: "var(--gray)", fontSize: 16, lineHeight: 1.8, marginBottom: 16 }}>
              Chúng tôi hiểu rõ nỗi lo của người tập về hàng giả, hàng kém chất lượng. Vì vậy,
              100% sản phẩm tại PowerFuel được nhập khẩu trực tiếp và có đầy đủ giấy tờ kiểm định.
            </p>
            <p style={{ color: "var(--gray)", fontSize: 16, lineHeight: 1.8 }}>
              Sau 5 năm hoạt động, chúng tôi tự hào phục vụ hơn 20,000 khách hàng và trở thành
              nhà phân phối uy tín của hơn 50 thương hiệu hàng đầu thế giới tại Việt Nam.
            </p>
          </div>
          <div className="about-image">
            <div style={{ fontSize: 120, textAlign: "center" }}>🏋️</div>
          </div>
        </div>
      </section>

      {/* ===== THỐNG KÊ ===== */}
      <div className="stats">
        {[
          { number: "2019",  label: "Năm thành lập"   },
          { number: "500+",  label: "Sản phẩm"        },
          { number: "20K+",  label: "Khách hàng"      },
          { number: "50+",   label: "Thương hiệu"     },
        ].map((s) => (
          <div className="stat-item" key={s.label}>
            <div className="stat-number">{s.number}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ===== GIÁ TRỊ CỐT LÕI ===== */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">GIÁ TRỊ <span>CỐT LÕI</span></h2>
        </div>
        <div className="values-grid">
          {[
            { icon: "🎯", title: "Chính trực",    desc: "Luôn trung thực với khách hàng về nguồn gốc, thành phần và hiệu quả của sản phẩm." },
            { icon: "💡", title: "Kiến thức",     desc: "Đội ngũ chuyên gia luôn cập nhật kiến thức mới nhất về dinh dưỡng thể thao." },
            { icon: "🤝", title: "Đồng hành",     desc: "Không chỉ bán sản phẩm, chúng tôi đồng hành cùng bạn trên hành trình chinh phục mục tiêu." },
            { icon: "🌱", title: "Phát triển bền vững", desc: "Ưu tiên sản phẩm thân thiện môi trường và đóng góp vào cộng đồng thể thao lành mạnh." },
          ].map((v) => (
            <div className="feature-card" key={v.title}>
              <div className="feature-icon">{v.icon}</div>
              <div className="feature-title">{v.title}</div>
              <div className="feature-desc">{v.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== ĐỘI NGŨ ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">ĐỘI NGŨ <span>CỦA CHÚNG TÔI</span></h2>
        </div>
        <div className="team-grid">
          {[
            { emoji: "👨‍💼", name: "Trần Minh Khoa",   role: "CEO & Founder",        desc: "10 năm kinh nghiệm trong lĩnh vực thể thao và dinh dưỡng." },
            { emoji: "👩‍⚕️", name: "Nguyễn Thị Hương", role: "Chuyên gia dinh dưỡng", desc: "Thạc sĩ Dinh dưỡng học, 7 năm tư vấn cho vận động viên chuyên nghiệp." },
            { emoji: "👨‍🔬", name: "Lê Văn Đức",       role: "Kiểm định chất lượng",  desc: "Kỹ sư hóa học, đảm bảo 100% sản phẩm đạt tiêu chuẩn chính hãng." },
          ].map((m) => (
            <div className="team-card" key={m.name}>
              <div className="team-avatar">{m.emoji}</div>
              <div className="team-name">{m.name}</div>
              <div className="team-role">{m.role}</div>
              <div className="team-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <div className="promo-banner" style={{ margin: "0 60px 70px" }}>
        <div className="promo-text">
          <h2>SẴN SÀNG<br />BẮT ĐẦU CHƯA?</h2>
          <p>Khám phá hơn 500 sản phẩm chính hãng và bắt đầu hành trình của bạn ngay hôm nay.</p>
        </div>
        <button className="btn-white" onClick={() => navigate("products")}>
          Khám phá ngay
        </button>
      </div>
    </div>
  );
};

export default AboutPage;
