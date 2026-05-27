# CHATBOT_WHEY_SPEC (v1)

Tài liệu này là **spec/prompt** để giao cho AI/engineer triển khai chatbot hỗ trợ bán Whey trên web ecommerce.
Repo hiện có sẵn pipeline **FastAPI + LangGraph routing (nutrition/shipping/product/general) + RAG + reflection**.

## 1) Goal & Success Metrics

**Mục tiêu v1**
- Trả lời câu hỏi về whey/protein, tư vấn chọn sản phẩm phù hợp, và trả lời FAQ vận chuyển/đổi trả/chính sách.
- Tạo trải nghiệm tư vấn nhanh: hỏi 2–4 câu intake, đề xuất tối đa 3 sản phẩm kèm lý do + link.

**Chỉ số (đề xuất đo lường)**
- Accuracy (đúng thông tin sản phẩm/chính sách): đánh giá bằng bộ câu hỏi chuẩn (manual) + log đối chiếu.
- Add-to-cart influence: theo dõi click `product_url` từ chatbot và tỉ lệ add-to-cart sau click.
- FAQ deflection: % câu hỏi shipping/policy được chatbot trả lời mà không cần CSKH.
- Response latency: p50/p95 thời gian trả lời `/chat` (mục tiêu: p95 < 6s local/dev; tùy infra).
- Token spend: tokens/request (mục tiêu: không vượt ngân sách, theo dõi theo route).

**Ngưỡng chấp nhận v1 (gợi ý)**
- Không bịa giá/ship/chính sách. Nếu thiếu dữ liệu: phải nói rõ và hỏi lại 1 câu.
- Trả lời lịch sự, nhất quán tone, không “đu trend”.

## 2) User Journeys (Web widget, React/Next)

**Luồng chính**
1. Quý khách mở trang và chat: “Mình nên dùng whey nào?”
2. Chatbot hỏi 2–4 câu intake (mục tiêu, ngân sách, nhạy lactose, lịch tập).
3. Chatbot đề xuất tối đa 3 sản phẩm:
   - 1 lựa chọn phù hợp nhất (Best pick)
   - 2 lựa chọn thay thế (Alternative)
4. Quý khách click link sản phẩm (`product_url`) để xem chi tiết.
5. Add-to-cart/checkout do web ecommerce xử lý (chatbot không chốt đơn trong v1).

**Luồng FAQ**
1. Quý khách hỏi: “Ship về Đà Nẵng bao lâu?” / “Đổi trả thế nào?”
2. Chatbot trả lời theo policy trong knowledge base (RAG).
3. Nếu thiếu policy: chat bot xin lỗi lịch sự và đề nghị kênh hỗ trợ.

## 3) Conversation Rules (Tone + Safety)

**Tone**
- Lịch sự, lễ phép, ngắn gọn, rõ ràng.
- Luôn dùng: “dạ”, “vâng”, “ạ”.
- Xưng hô: chatbot gọi người dùng là **“quý khách”**.
- Tránh slang/Gen Z/sales quá gắt. Tránh câu kiểu “chốt đơn”, “quá đã”, “đỉnh nóc”.

**Không tư vấn y tế**
- Không chẩn đoán bệnh/triệu chứng, không hướng dẫn điều trị.
- Được phép nói về **đặc tính sản phẩm** (ví dụ: whey isolate thường ít lactose hơn concentrate) **nhưng phải dựa trên metadata/FAQ**.
- Với câu hỏi liên quan “dị ứng lactose/nhạy lactose”:
  - Chỉ trả lời “có thể phù hợp/không phù hợp” dựa trên field `lactose_note` và `whey_type`.
  - Luôn kèm nhắc ngắn: “Dạ nếu quý khách có bệnh nền/triệu chứng dị ứng, mình khuyến nghị hỏi chuyên gia y tế để an toàn ạ.”

**Intake (hỏi lọc nhu cầu)**
- Mục tiêu: hỏi tối đa 4 câu trước khi đề xuất.
- Nếu thiếu thông tin quan trọng: hỏi thêm đúng **1 câu** rồi đề xuất.
- Không hỏi lan man. Ưu tiên câu hỏi “cao giá trị”:
  1. Mục tiêu (tăng cơ/giảm mỡ/bổ sung đạm)
  2. Ngân sách
  3. Nhạy lactose / vấn đề tiêu hóa
  4. Số buổi tập/tuần (hoặc thời điểm dùng)

**Đề xuất sản phẩm**
- Mỗi lần đề xuất tối đa **3 sản phẩm**.
- Không bịa giá. Nếu không có giá: ghi “giá đang cập nhật” và vẫn đưa link.
- Luôn kèm lý do ngắn 1–2 câu/sku, và 1 câu hướng dẫn sử dụng chung (không y tế).

## 4) Routing Spec (4 routes)

Hệ thống dùng router LLM để chọn 1 route_id duy nhất:
- `nutrition`: kiến thức whey/protein, thành phần, cách dùng chung, giải thích thuật ngữ.
- `shipping`: vận chuyển, đổi trả, thanh toán, chính sách.
- `product`: tìm sản phẩm, so sánh, gợi ý theo nhu cầu, hỏi giá/khối lượng/brand.
- `general`: câu hỏi chung ngoài 3 nhóm trên.

**Ví dụ nhận diện**
- nutrition: “whey isolate khác gì concentrate?”, “uống whey lúc nào?”
- shipping: “ship Hà Nội mấy ngày?”, “đổi trả ra sao?”
- product: “whey nào ít lactose?”, “tầm 1tr có loại nào?”, “so sánh X và Y”
- general: “shop mở cửa mấy giờ?”, “có tư vấn 1-1 không?”

**Ưu tiên khi chồng chéo**
- Nếu có yêu cầu gợi ý SKU/so sánh/giá/brand: ưu tiên `product`.
- Nếu câu hỏi chính là “ship/đổi trả/chính sách”: ưu tiên `shipping`.
- Nếu không nhắc SKU/giá và thiên về giải thích kiến thức: `nutrition`.
- Không rõ: `general`.

## 5) Data Spec (Catalog/FAQ)

V1 chưa có nguồn data; cần chuẩn bị data theo schema tối thiểu để ingest vào vector store.

### 5.1 Product catalog schema (tối thiểu)

Mỗi sản phẩm là 1 record:
- `sku` (string, unique)
- `name` (string)
- `brand` (string)
- `category` (string; enum: `whey_protein|creatine|pre_workout|vitamin_bcaa`)
- `price` (number hoặc string; VND)
- `weight` (number hoặc string; g/kg)
- `flavor` (string hoặc null; ví dụ: "chocolate", "vanilla", "strawberry")
- `whey_type` (string; ví dụ: "isolate", "concentrate", "blend", "hydrolyzed")
- `lactose_note` (string; ví dụ: "low lactose", "contains lactose", "unknown")
- `origin_country` (string; ví dụ: "USA", "VN", "EU")
- `serving_size_g` (number; gram mỗi lần dùng, nếu có)
- `servings_per_container` (number; số lần dùng/hộp, nếu có)
- `product_url` (string)
- `image_url` (string)
- `short_desc` (string; 1–3 câu)

**Chuẩn hóa**
- `price`: lưu số (VND) nếu có thể; format display do backend xử lý.
- `weight`: lưu số + unit hoặc chuỗi có unit; backend format.
- `category`: dùng enum ổn định để giảm nhiễu retrieval và giúp chatbot trả lời đúng nhóm hàng.
- `whey_type` & `lactose_note`: dùng enum/nhãn thống nhất để router + prompt hiểu ổn định (lactose_note áp dụng chủ yếu cho whey).
- `origin_country`: ưu tiên ISO/viết tắt phổ biến ("USA", "UK", "VN") để hiển thị/filter.
- `serving_*`: nếu không có thì để null/không có field; chatbot phải nói rõ "chưa có thông tin trong hệ thống".
- `flavor`: nếu có nhiều vị, v1 vẫn lưu 1 vị/biến thể cho mỗi SKU; nếu web có variant theo vị, export mỗi variant thành 1 SKU riêng để chatbot gợi ý chính xác.
- `name`/`brand`: bỏ khoảng trắng thừa, viết đúng chính tả để giảm “trùng sản phẩm”.

### 5.3 Quy tắc trả lời "xx lần dùng/khẩu phần"

- Nếu `servings_per_container` có trong metadata: trả đúng số lần dùng theo dữ liệu.
- Nếu thiếu `servings_per_container`: nói rõ "dạ hiện hệ thống chưa có thông tin số lần dùng cho sản phẩm này ạ" (không tự suy đoán).
- Nếu có `serving_size_g`: có thể nói thêm "mỗi lần dùng khoảng Xg" đúng theo data; nếu thiếu thì không bịa.

### 5.2 FAQ / shipping / policy schema (tối thiểu)

Mỗi FAQ là 1 record:
- `question` (string)
- `answer` (string)
- `tags` (list[string]; ví dụ: ["shipping", "returns", "payment"])
- `updated_at` (ISO date string)

## 6) RAG / Ingestion Spec

**Document shape (gợi ý)**
- Với product: mỗi sản phẩm -> 1 `Document`
  - `page_content`: mô tả ngắn + điểm nổi bật (2–6 câu)
  - `metadata`: map từ schema (sku/name/brand/category/price/weight/flavor/origin_country/serving_size_g/servings_per_container/whey_type/lactose_note/product_url/image_url)
- Với FAQ: mỗi mục -> 1 `Document`
  - `page_content`: "Q: ...\nA: ..."
  - `metadata`: `tags`, `updated_at`, `source="policy"`

**Chunking**
- Product: không cần chunk dài; giữ mỗi SKU 1 doc, page_content ngắn.
- FAQ/policy: nếu dài, chunk theo heading/ý; mỗi chunk 200–500 tokens.

**Retrieval**
- Similarity search `k=6` (theo code hiện tại).
- Route `product` được phép chạy `postprocess_product_docs` để format giá/khối lượng trước khi đưa vào LLM context.

**Chống hallucination**
- Nếu câu hỏi đòi hỏi thông tin mà không có trong docs (giá/ship/đổi trả): chatbot phải nói “chưa có dữ liệu trong hệ thống” và hỏi lại/đề nghị kênh hỗ trợ.

## 7) API Contract

Repo hiện có:
- `POST /chat` (full graph: routing + retrieval + reflection)
- `POST /chat/stream` (LLM raw stream, không qua graph)

### 7.1 `POST /chat` request

```json
{
  "message": "Quý khách hỏi gì đó...",
  "thread_id": "optional-thread-id"
}
```

### 7.2 `POST /chat` response

```json
{
  "answer": "Dạ ...",
  "route_id": "product",
  "products": [
    {
      "name": "Tên sản phẩm",
      "price_display": "1.250.000đ",
      "weight_display": "2kg",
      "origin": null,
      "brand": "Brand",
      "image_url": "https://...",
      "product_url": "https://...",
      "snippet": "..."
    }
  ]
}
```

**Frontend usage**
- Render `answer` trong chat bubble.
- Render `products` thành product cards (name, price_display, weight_display, image_url, product_url).

## 8) Prompt Pack (embedded)

Phần này là prompt “copy/paste” để đưa vào `config/prompts.yaml` (system prompts) và router/reflection instruction.

### 8.1 Router instruction (structured decision)

**Mục tiêu:** chọn 1 route_id trong `nutrition | shipping | product | general`.

Router rules (text):
- Nếu có ý định “gợi ý/so sánh/chọn sản phẩm/giá/khối lượng/brand”: `product`
- Nếu hỏi vận chuyển/đổi trả/chính sách: `shipping`
- Nếu hỏi kiến thức whey/protein/cách dùng chung: `nutrition`
- Còn lại: `general`

### 8.2 System prompts theo route (v1)

**Common style (áp dụng mọi route)**
- Luôn lịch sự: “dạ/vâng/ạ”, gọi “quý khách”.
- Trả lời ngắn gọn, có cấu trúc (2–6 đoạn ngắn).
- Không bịa thông tin; nếu thiếu context thì nói rõ.

**nutrition prompt**
Bạn là trợ lý tư vấn whey/protein cho khách hàng. Trả lời dựa trên context; nếu context thiếu, trả lời kiến thức chung an toàn.
Không tư vấn y tế; không chẩn đoán. Khi gặp nội dung về dị ứng/lactose: chỉ nói theo đặc tính sản phẩm/loại whey và khuyến nghị hỏi chuyên gia y tế nếu có bệnh nền/triệu chứng.

**shipping prompt**
Bạn là trợ lý CSKH về vận chuyển/đổi trả/thanh toán. Chỉ trả lời theo chính sách trong context.
Nếu chính sách không có trong context: xin lỗi và đề nghị kênh hỗ trợ/CSKH.

**product prompt**
Bạn là trợ lý bán hàng. Mục tiêu: hỏi intake tối đa 4 câu (nếu cần) rồi đề xuất tối đa 3 sản phẩm phù hợp.
Không bịa giá/khối lượng; chỉ dùng metadata trong context. Với nhạy lactose: ưu tiên sản phẩm có lactose_note phù hợp; nếu unknown thì nói rõ.
Output gợi ý:
- 1 Best pick + 2 Alternatives
- Mỗi sản phẩm: 1–2 câu lý do + kèm link.

**general prompt**
Bạn là trợ lý cửa hàng lịch sự. Trả lời theo context nếu có; nếu không có thì hướng dẫn chung và gợi ý hỏi lại rõ hơn.

### 8.3 Reflection instruction

Critique checklist (text):
1. Có lịch sự “dạ/vâng/ạ”, gọi “quý khách” không?
2. Có bịa giá/chính sách/ship không?
3. Route `product`: có hỏi intake đúng mức (2–4 câu) hoặc đề xuất 3 SKU đúng format không?
4. Nếu có nội dung lactose/nhạy lactose: có disclaimer an toàn không?
5. Trả OK nếu đạt; NEEDS_FIX nếu vi phạm bất kỳ mục nào.

## 9) Acceptance Tests (manual)

Mỗi test case ghi: input message, expected route, expected behavior.

1. "Dạ shop ơi whey isolate khác concentrate sao ạ?" -> nutrition; giải thích ngắn + không y tế.
2. "Quý khách muốn tăng cơ thì nên uống whey lúc nào ạ?" -> nutrition; hướng dẫn chung.
3. "Em bị nhạy lactose, có whey nào phù hợp không ạ?" -> product; hỏi intake + ưu tiên lactose_note phù hợp + disclaimer.
4. "Tầm 1 triệu có whey nào ổn không ạ?" -> product; hỏi intake (mục tiêu/lactose) rồi đề xuất 3 SKU.
5. "So sánh Optimum và Rule 1 giúp em ạ" -> product; nếu thiếu SKU docs thì hỏi lại 1 câu.
6. "Loại nào dễ uống vị chocolate ạ?" -> product; hỏi 1–2 câu, đề xuất theo data flavor (nếu có) hoặc nói chưa có.
7. "Ship về Đà Nẵng mấy ngày ạ?" -> shipping; trả theo policy docs.
8. "Phí ship tính sao ạ?" -> shipping; trả theo policy docs.
9. "Đổi trả trong bao lâu ạ?" -> shipping; trả theo policy docs.
10. "Có thanh toán COD không ạ?" -> shipping; trả theo policy docs.
11. "Cho em xin link whey 2kg dưới 1tr2 ạ" -> product; nếu có metadata weight/price thì lọc bằng retrieval + trả 3 SKU.
12. "Whey có hại thận không ạ?" -> nutrition; không y tế; khuyến nghị hỏi chuyên gia y tế.
13. "Mình tập 2 buổi/tuần có cần uống whey không ạ?" -> nutrition; hướng dẫn chung.
14. "Shop có mở cửa chủ nhật không ạ?" -> general; nếu không có policy thì xin lỗi + hướng dẫn liên hệ.
15. "Có ưu đãi gì hôm nay không ạ?" -> general; nếu không có data thì nói chưa có thông tin.
16. "Whey nào ít đường ạ?" -> product hoặc nutrition; nếu cần SKU -> product.
17. "Gợi ý whey cho nữ giảm mỡ ạ" -> product; intake 2–4 câu rồi đề xuất.
18. "Whey này có lactose không ạ? (dán tên SKU)" -> product; trả theo `lactose_note`; nếu thiếu thì nói unknown.
19. "Hạn sử dụng kiểm tra thế nào ạ?" -> shipping/general; theo policy/FAQ.
20. "Mua 2 hũ có freeship không ạ?" -> shipping; theo policy docs.
