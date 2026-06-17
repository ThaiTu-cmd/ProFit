# ProFit - Project Data Crawler

Trích xuất toàn bộ dữ liệu sản phẩm + ảnh từ **project ProFit hiện có** (`c:\Users\Admin\profit_new\profit`) ra CSV + folder ảnh, **READ-ONLY** — không sửa / không xóa bất kỳ file nào trong project.

## Nguồn dữ liệu

| Nguồn | Mô tả |
|---|---|
| MySQL `profitsuppsdb` (user `root` / pwd `root`) | 65 sản phẩm, 4 danh mục, 65 ảnh, 5 tag |
| `backend/src/main/resources/static/uploads/products/image-{1..65}.jpg` | 65 file ảnh (được copy sang output, file gốc không đổi) |

## Cấu trúc output

```
crawl/
├── crawl_profit_project.mjs  # Script chính
├── package.json              # mysql2 + sharp + cheerio
└── output/
    ├── products.csv          # 65 sản phẩm (24 cột, khớp schema DB)
    ├── categories.csv        # 4 danh mục
    ├── product_images.csv    # mapping product -> ảnh local
    ├── crawl_summary.json    # tóm tắt + timestamp
    ├── crawl.log             # log
    └── images/
        ├── 001_optimum-nutrition-gold-standard-100-whey-5lbs/
        │   └── 1.jpg
        ├── 002_rule-1-protein-isolate-5lbs/
        │   └── 1.jpg
        └── ... (65 folders)
```

## Cột CSV (`products.csv`)

Khớp 100% schema trong `backend/src/main/java/.../entity/Product.java` + `dto/response/ProductResponse.java`:

| Cột | Nguồn | Mô tả |
|---|---|---|
| `id` | `products.id` | ID sản phẩm |
| `sku` | `products.sku` | Mã SKU |
| `slug` | `products.slug` | URL slug |
| `name` | `products.name` | Tên sản phẩm |
| `category_id` / `category_name` / `category_slug` | JOIN `categories` | Danh mục |
| `short_description` | `products.short_description` | Mô tả ngắn |
| `description` | `products.description` | Mô tả đầy đủ (TEXT) |
| `price` | `products.price` | Giá hiện tại (VND) |
| `old_price` | `products.old_price` | Giá gốc (nếu có) |
| `rating_avg` / `rating_count` | `products.*` | Rating |
| `stock_quantity` | `products.stock_quantity` | Tồn kho |
| `is_active` | `products.is_active` | Đang hiển thị |
| `tags` | JOIN `product_tags` qua `product_tag_map` | Tags, phân cách `, ` |
| `primary_image_url` | `product_images.image_url` (is_primary=1) | URL gốc trong project |
| `primary_image_filename` | – | Tên file local: `1.jpg` |
| `image_count` | `COUNT(product_images WHERE product_id=?)` | Số ảnh của SP |
| `local_folder` | – | Tên folder trong `output/images/` |
| `local_image_files` | – | Danh sách file, phân cách `\|` |
| `created_at` / `updated_at` | `products.*` | Timestamps |

## Cách chạy

```bash
# 1. Cài deps (1 lần)
npm install

# 2. Đảm bảo MySQL đang chạy + DB profitsuppsdb đã có data
#    (Đã có sẵn trên máy, mật khẩu root/root)

# 3. Chạy
node crawl_profit_project.mjs
```

## Tuỳ chỉnh

Sửa đầu file `crawl_profit_project.mjs`:

```js
const DB_CONFIG = {
  host: "localhost", port: 3306, user: "root",
  password: "root", database: "profitsuppsdb",  // <- đổi nếu khác
};

const BACKEND_UPLOADS = path.join(PROFIT_ROOT, "backend", "src", "main", "resources", "static", "uploads", "products");
```

## Lưu ý an toàn

- ✅ **Project source code KHÔNG bị đụng** — script chỉ `SELECT` từ DB và `copy` file ảnh sang folder output.
- ✅ File gốc `backend/static/uploads/products/image-N.jpg` giữ nguyên 100% (copy sang chỗ khác).
- ✅ Có thể chạy lại nhiều lần (idempotent) — ảnh đã tồn tại sẽ được skip.
