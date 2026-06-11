# BÁO CÁO CUỐI KỲ — ProFit

# Đề tài: Xây dựng hệ thống Thương mại Điện tử hỗ trợ bán hàng Thực phẩm Bổ sung — Ứng dụng AI Chatbot Tư vấn Sản phẩm

# Thời gian trình bày: ~10 phút

---

# PHẦN I: GIỚI THIỆU ĐỀ TÀI

## 1. Bối cảnh

Thị trường thực phẩm bổ sung (supplement) tại Việt Nam tăng trưởng mạnh, đặc biệt Whey Protein, Creatine, Pre-Workout. Song song, 3 vấn đề nổi bật:

- **Thông tin phức tạp**: Người mới tập gym không phân biệt được Whey Isolate vs Concentrate, không biết chọn sản phẩm nào phù hợp mục tiêu.
- **CSKH quá tải**: Câu hỏi lặp đi lặp lại về sản phẩm, ship, đổi trả chiếm 30-40% khối lượng CSKH.
- **Thiếu cá nhân hóa**: Các website supplement truyền thống chỉ hiển thị danh sách sản phẩm, không có cơ chế tư vấn thông minh.

## 2. Vấn đề cần giải quyết

1. Người dùng khó chọn sản phẩm phù hợp → cần chatbot tư vấn cá nhân hóa
2. CSKH quá tải → cần chatbot tự động trả lời FAQ
3. Không có kênh hỗ trợ 24/7 → cần chatbot AI luôn online
4. Rủi ro thông tin sai → chatbot phải dựa trên dữ liệu thực, không bịa đặt

## 3. Mục tiêu

- Xây dựng nền tảng E-commerce hoàn chỉnh (duyệt sản phẩm → đặt hàng → thanh toán)
- Tích hợp **AI Chatbot tư vấn thông minh** — điểm nhấn và cốt lõi của đề tài
- Chatbot dùng kỹ thuật **Agentic RAG** — truy xuất dữ liệu thực từ catalog sản phẩm + chính sách
- Giảm tải CSKH, nâng cao trải nghiệm mua sắm , giải quyết các vấn đề về hàng hóa qua online

## 4. Phạm vi

**Làm:**

- Website E-commerce: sản phẩm, giỏ hàng, đặt hàng, thanh toán (COD, Banking QR, VNPAY)
- AI Chatbot tư vấn sản phẩm tích hợp trên website
- Trang quản trị admin
- Triển khai Docker Compose

**Không làm:**

- Không có app di động
- Không tích hợp đơn vị vận chuyển tự động (GHTK, GHN)
- Không có hệ thống voucher/phần thưởng phức tạp
- chưa tích hợp ngân hàng thật

---

# PHẦN II: NỀN TẢNG LÝ THUYẾT

## Công nghệ chính: Agentic RAG + LangGraph + LangChain + PGVector

### Vấn đề từ đề tài

Chatbot cần: hiểu sâu về sản phẩm supplement, phân loại ý định người dùng, tìm kiếm chính xác từ cơ sở tri thức, và trả lời theo phong cách Việt Nam mà không bịa đặt. Đây chính là bài toán mà Agentic RAG được thiết kế để giải quyết.

### Yêu cầu từ đề tài

- Truy xuất thông tin chính xác từ catalog + chính sách (RAG)
- Phân loại ý định thông minh (Intent Routing) — 4 nhóm: sản phẩm, dinh dưỡng, vận chuyển, chung
- Xử lý đa bước, có trạng thái — chatbot phải hỏi intake rồi mới đề xuất
- Kiểm tra chất lượng câu trả lời tự động (Reflection)
- Không được bịa thông tin (Hallucination prevention)

### Lựa chọn công nghệ

| Tiêu chí                         | Rule-based Bot | Fine-tuned LLM | Agentic RAG + LangGraph      |
| -------------------------------- | -------------- | -------------- | ---------------------------- |
| Độ chính xác thông tin           | Cao (cứng)     | Trung bình     | **Cao (dựa trên retrieval)** |
| Xử lý đa bước / có trạng thái    | Không          | Hạn chế        | **Có (graph-based)**         |
| Reflection / kiểm tra chất lượng | Không          | Không          | **Có (reflection loop)**     |
| Chi phí vận hành                 | Thấp           | Rất cao        | **Trung bình**               |

**Tại sao chọn LangGraph + LangChain + PGVector:**

- **LangGraph**: Xây dựng pipeline dạng đồ thị — mỗi bước (route, retrieve, generate, reflect) là một node, dễ mở rộng, dễ debug, có trạng thái.
- **LangChain**: Cung cấp abstraction cho RAG — embedding, vector store, retrieval chain.
- **PGVector**: Vector DB miễn phí, tự host bằng Docker, tích hợp tốt với hệ sinh thái LangChain.
- **BM25 + Vector + RRF**: Kết hợp keyword search và semantic search cho kết quả tối ưu.

### Sử dụng trong đề tài

Pipeline LangGraph gồm 6 node:

```
User Message
    ↓
prepare_memory (trim lịch sử chat)
    ↓
route_query (LLM phân loại intent → 4 route: product/nutrition/shipping/general)
    ↓
retrieve (hybrid search: BM25 + PGVector → RRF merge → top 6 docs)
    ↓
generate (LLM sinh câu trả lời theo system prompt theo route)
    ↓
reflect (LLM critique kiểm tra: bịa không? đúng style không? đủ intake chưa?)
    ↓ Nếu NEEDS_FIX → quay lại generate (tối đa 3 vòng)
    ↓ Nếu OK → finish
    ↓
Trả về {answer, route_id, products[]}
```

## Công nghệ phụ

| Công nghệ                     | Vai trò                 | Lựa chọn vì                                                                  |
| ----------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| **Spring Boot 4.0 (Java 21)** | Backend REST API        | Tiêu chuẩn enterprise, bảo mật (JWT/OAuth2), JPA ORM, hệ sinh thái phong phú |
| **React 18 + Vite**           | Frontend SPA            | Fast HMR, component reuse, hệ sinh thái lớn                                  |
| **MySQL**                     | Database chính          | RDBMS phổ biến, miễn phí, JPA tích hợp tốt                                   |
| **FastAPI (Python)**          | Chatbot API             | Async, SSE streaming, tích hợp LangChain tốt                                 |
| **Docker Compose**            | Container hóa           | 4 service chạy đồng nhất: backend, frontend, pgvector, chatbot               |
| **Recharts**                  | Biểu đồ dashboard admin | Nhẹ, React-friendly, đẹp                                                     |
| **VNPAY SDK**                 | Thanh toán trực tuyến   | Cổng thanh toán phổ biến tại Việt Nam                                        |

---

# PHẦN III: GIẢI PHÁP

## Bối cảnh sử dụng — Bài toán

**Tình huống thực tế:**

_Khách hàng A là người mới tập gym, muốn mua Whey Protein nhưng không biết chọn loại nào. Hỏi chatbot:_

> "Mình bị nhạy lactose, tập gym 3 buổi/tuần, ngân sách tầm 1 triệu"

→ Chatbot tự động phân loại: **route = product**

→ Hỏi 2 câu intake thêm: "Mục tiêu của bạn là tăng cơ hay giảm mỡ?" + "Bạn ưu tiên vị gì?"

→ Truy xuất từ PGVector → đề xuất 3 sản phẩm phù hợp (1 best pick + 2 alternatives), kèm lý do và link mua hàng

→ Khách click link → xem chi tiết → thêm vào giỏ → thanh toán COD

## Mô hình vận hành

Hệ thống gồm 4 service chạy độc lập qua Docker Compose:

**Luồng E-commerce:**

1. Khách truy cập website → Frontend React load → duyệt sản phẩm (filter, search, phân trang)
2. Thêm vào giỏ → checkout → chọn thanh toán (COD / Banking QR / VNPAY)
3. Backend Spring Boot xử lý đơn hàng → lưu MySQL → trả order code
4. Admin đăng nhập → dashboard → quản lý đơn hàng, sản phẩm, người dùng

**Luồng Chatbot AI:**

1. Khách chat → ChatWidget gửi SSE đến FastAPI
2. FastAPI khởi tạo LangGraph → trim_memory → route_query (LLM phân loại intent)
3. Retriever truy vấn PGVector (hybrid BM25 + vector) → lấy top 6 docs
4. Generator LLM sinh câu trả lời với system prompt riêng theo route
5. Reflection loop kiểm tra (bịa không? đúng style không?) → tối đa 3 vòng
6. Trả streaming response về ChatWidget hiển thị real-time

**Luồng thanh toán VNPAY:**

1. Khách chọn VNPAY → Backend tạo URL thanh toán với HMAC-SHA256 signature
2. Redirect sang cổng VNPAY sandbox → khách thanh toán
3. VNPAY redirect về website → Backend verify signature → cập nhật trạng thái

## Luồng dữ liệu

### Luồng Chatbot

**Input:**

- Tin nhắn người dùng (string, tối đa 500 ký tự) + Thread ID
- Nguồn tri thức: catalog sản phẩm + chính sách (JSON → embed → PGVector)

**Xử lý:**

- FastAPI nhận → LangGraph state: `{messages, user_query, reflection_count}`
- Router LLM: structured output chọn 1 trong 4 route
- Retriever: hybrid search (BM25 + vector) → RRF merge → top 6 docs
- Generator: LLM + system prompt theo route + retrieved context
- Reflection: critique loop (max 3 vòng)

**Output:**

- Stream text (SSE) → ChatWidget hiển thị real-time
- JSON: `{answer, route_id, products[]}` — danh sách sản phẩm đề xuất

### Luồng E-commerce

**Input:**

- GET `/api/public/products` → danh sách sản phẩm (filter/search/pagination)
- POST `/api/orders` → tạo đơn hàng (JWT required)
- POST `/api/payment/vnpay/create` → tạo thanh toán VNPAY

**Xử lý:**

- Backend Spring Boot: JWT validation → Service layer → JPA → MySQL
- VNPayConfig: xây dựng URL thanh toán + HMAC-SHA256 signature

**Output:**

- JSON response: order, product list, payment URL
- Dashboard admin: thống kê doanh thu (Recharts)

---

# PHẦN IV: CẢI TIẾN

## Kết quả thực tế khi demo

**E-commerce:**

- Website tải nhanh, UI dark theme premium với hiệu ứng aurora và glassmorphism
- Giỏ hàng hoạt động tốt, persist localStorage, tự tính phí ship (miễn phí khi ≥500K)
- Checkout flow hoàn chỉnh: điền thông tin → chọn thanh toán → tạo đơn
- VNPAY tích hợp thành công với sandbox
- Dashboard admin với biểu đồ doanh thu, CRUD sản phẩm, quản lý đơn hàng

**Chatbot AI:**

- ChatWidget floating ở góc phải, streaming response real-time
- Routing chính xác: câu hỏi whey → product route; câu hỏi ship → shipping route
- Luồng intake: hỏi mục tiêu → hỏi ngân sách → đề xuất sản phẩm
- Phong cách lịch sự ("dạ/vâng/quý khách"), có disclaimer khi liên quan sức khỏe
- Nếu không có dữ liệu: nói rõ, không bịa

## So sánh với phần mềm tương tự

| Tiêu chí                     | ProFit (đề tài)                            | Shopee/Lazada | Website supplement truyền thống |
| ---------------------------- | ------------------------------------------ | ------------- | ------------------------------- |
| Tư vấn sản phẩm cá nhân hóa  | **Có — AI hỏi intake, đề xuất 3 sản phẩm** | Không         | Không                           |
| Chatbot AI RAG               | **Có — trả lời đúng dựa trên catalog**     | Không         | Không                           |
| Routing thông minh (4 route) | **Có**                                     | Không         | Không                           |
| Reflection loop              | **Có — tự kiểm tra chất lượng**            | Không         | Không                           |
| Streaming response           | **Có**                                     | Không         | Không                           |
| Chuyên biệt ngành supplement | **Có**                                     | Không         | Có                              |
| Thanh toán đa phương thức    | COD + Banking + VNPAY                      | Rất đa dạng   | Thường chỉ COD                  |

**Điểm cải tiến nổi bật:**

1. **Tư vấn cá nhân hóa bằng AI** — Không chỉ gợi ý theo lượt xem như Shopee, mà chatbot thực sự hỏi nhu cầu (mục tiêu, ngân sách, tình trạng sức khỏe) rồi đề xuất sản phẩm cụ thể — điều này rule-based bot hoặc keyword search không làm được.

2. **Agentic RAG thay vì single-turn Q&A** — Khác chatbot FAQ thông thường, LangGraph có reflection loop: nếu câu trả lời không đạt chuẩn (bịa thông tin, thiếu phong cách), hệ thống tự động viết lại. Giảm rủi ro cung cấp thông tin sai.

3. **Hybrid Search (BM25 + Vector + RRF)** — Người dùng hỏi bằng ngôn ngữ tự nhiên ("loại nào dễ uống vị chocolate") vẫn nhận kết quả chính xác, kết hợp ưu điểm của cả keyword search lẫn semantic search.

4. **Chuyên biệt ngành supplement** — Chatbot hiểu whey type, lactose_note, servings_per_container, cách intake theo mục tiêu (tăng cơ/giảm mỡ/bổ sung đạm). Không phải chatbot đa năng generic.

5. **Triển khai Docker** — Toàn bộ hệ thống đóng gói 4 service, deploy bằng 1 lệnh `docker compose up`.

---

# LỜI KẾT

ProFit đã xây dựng thành công hệ thống E-commerce hoàn chỉnh cho ngành supplement, với **điểm nhấn cốt lõi là AI Chatbot Agentic RAG** — tư vấn cá nhân hóa, dựa trên dữ liệu thực, tự kiểm tra chất lượng câu trả lời. Đặt nền móng cho nhiều hướng phát triển tiếp theo: recommendation engine, chatbot đa kênh (Zalo, Messenger), membership system.

---

# MẪU SLIDE GỢI Ý (10 phút)

| Slide | Nội dung                                           | Thời gian |
| ----- | -------------------------------------------------- | --------- |
| 1     | Slide tiêu đề: Tên đề tài + logo                   | 30s       |
| 2     | Bối cảnh — 3 vấn đề thị trường                     | 1 phút    |
| 3     | Mục tiêu & Phạm vi                                 | 30s       |
| 4     | Sơ đồ kiến trúc hệ thống (4 service)               | 30s       |
| 5     | Công nghệ chính — Agentic RAG + LangGraph          | 1 phút    |
| 6     | Pipeline LangGraph (6 bước)                        | 1.5 phút  |
| 7     | Demo: Khách hỏi chatbot → chatbot đề xuất sản phẩm | 2 phút    |
| 8     | So sánh với giải pháp truyền thống                 | 1 phút    |
| 9     | Kết quả đạt được + Hướng phát triển                | 1 phút    |
| 10    | Cảm ơn + Q&A                                       | 30s       |
