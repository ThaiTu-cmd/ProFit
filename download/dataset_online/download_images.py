"""
Script tải ảnh sản phẩm supplement từ Google Images.
Chạy: python download_images.py

Yêu cầu cài đặt:
    pip install requests Pillow

Cách hoạt động:
    1. Đọc products.json
    2. Với mỗi sản phẩm, tạo filename từ brand + name + flavor
    3. Dùng Google Images thumbnail CDN để lấy ảnh
    4. Tải ảnh về thư mục đúng theo category
"""

import os
import json
import time
import requests
from pathlib import Path
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import ssl

# ── Cấu hình ──────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
JSON_PATH  = BASE_DIR / "products.json"
OUT_DIR    = BASE_DIR / "images"
TIMEOUT    = 10          # giây timeout mỗi ảnh
MAX_WORKERS = 5          # số thread download song song
SLEEP_BETWEEN = 0.5     # giây nghỉ giữa mỗi request (tránh block)

# ── Headers giả lập trình duyệt ────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}

# ── Tạo URL ảnh từ Google Images thumbnail CDN ─────────────
def google_image_url(query: str) -> str:
    """Tạo Google Images thumbnail URL từ query string."""
    q = quote(query.strip())
    # URL Google Images thumbnail (trả về ảnh nhỏ, dùng làm preview)
    return (
        f"https://www.google.com/search?tbm=isch&q={q}&udm=24"
    )

def google_thumbnail_url(query: str) -> str:
    """Tạo Google thumbnail CDN URL (ảnh trực tiếp, kích thước nhỏ)."""
    q = quote(query.strip())
    return (
        f"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9Gc"
        f"{abs(hash(q)) % (10**10)}&s"
    )

# ── Tải 1 ảnh ──────────────────────────────────────────────
def download_image(product: dict) -> dict:
    """Tải ảnh cho 1 sản phẩm. Trả về dict kết quả."""
    category = product.get("category", "unknown")
    brand    = product.get("brand", "").replace("/", "-").replace("\\", "-")
    name     = product.get("name", "").replace("/", "-").replace("\\", "-")
    flavor   = product.get("flavor", "").replace("/", "-").replace("\\", "-")
    prod_id  = product.get("id", 0)

    # Tạo tên file: id_brand_name_flavor.jpg
    safe_name = f"{prod_id:03d}_{brand}_{name}_{flavor}"
    safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in safe_name)
    safe_name = safe_name[:200]  # giới hạn độ dài

    # Thư mục đích
    cat_dir = OUT_DIR / category
    cat_dir.mkdir(parents=True, exist_ok=True)

    file_path = cat_dir / f"{safe_name}.jpg"
    if file_path.exists():
        return {"id": prod_id, "status": "exists", "path": str(file_path)}

    # Query tìm kiếm
    query = f"{brand} {name} {flavor} supplement"

    # Thử nhiều nguồn ảnh
    urls_to_try = [
        # 1. Google Images search page → lấy thumbnail redirect
        google_image_url(query),
        # 2. DuckDuckGo Images
        f"https://duckduckgo.com/?q={quote(query)}&t=h_&iax=images&ia=images",
        # 3. Bing Images
        f"https://www.bing.com/images/search?q={quote(query)}",
        # 4. Fallback: logo brand placeholder
        f"https://logo.clearbit.com/{brand.lower().replace(' ', '')}.com",
    ]

    success = False
    for url in urls_to_try:
        try:
            if "logo.clearbit.com" in url:
                resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
            else:
                resp = requests.get(
                    "https://www.google.com/search?tbm=isch&q=" + quote(query),
                    headers=HEADERS,
                    timeout=TIMEOUT,
                    allow_redirects=True
                )

            if resp.status_code == 200 and len(resp.content) > 500:
                with open(file_path, "wb") as f:
                    f.write(resp.content)
                success = True
                break
        except Exception:
            continue

    if success:
        return {"id": prod_id, "status": "saved", "path": str(file_path), "size": len(resp.content)}
    else:
        return {"id": prod_id, "status": "failed", "query": query}


# ── Main ───────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  SUPPLEMENT IMAGE SCRAPER")
    print("  Source: products.json")
    print("  Output: download/dataset_online/images/")
    print("=" * 60)

    # Đọc products.json
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        products = json.load(f)

    print(f"\nTổng sản phẩm: {len(products)}")
    print(f"Output folder: {OUT_DIR}")
    print()

    # Tạo folder
    categories = set(p["category"] for p in products)
    for cat in categories:
        (OUT_DIR / cat).mkdir(parents=True, exist_ok=True)

    # Đếm theo category
    cat_counts = {}
    for p in products:
        cat_counts[p["category"]] = cat_counts.get(p["category"], 0) + 1
    for cat, cnt in sorted(cat_counts.items()):
        print(f"  {cat}: {cnt} sản phẩm")

    print(f"\nBắt đầu tải ảnh...")
    print(f"  Thread: {MAX_WORKERS}")
    print(f"  Timeout: {TIMEOUT}s/request")
    print(f"  Sleep: {SLEEP_BETWEEN}s")
    print()

    saved = 0
    failed = 0
    skipped = 0

    # Download tuần tự để tránh block
    for i, product in enumerate(products, 1):
        result = download_image(product)
        status = result["status"]
        if status == "saved":
            saved += 1
            print(f"  [{i}/{len(products)}] ✅ SAVED: {result['path']} ({result.get('size', 0)//1024}KB)")
        elif status == "exists":
            skipped += 1
            print(f"  [{i}/{len(products)}] ⏭️  EXISTS: {product.get('name', '')}")
        else:
            failed += 1
            print(f"  [{i}/{len(products)}] ❌ FAILED: {product.get('name', '')}")
            print(f"       Query: {result.get('query', '')}")

        time.sleep(SLEEP_BETWEEN)

    # Tổng kết
    print()
    print("=" * 60)
    print("  KẾT QUẢ")
    print(f"  ✅ Saved : {saved}")
    print(f"  ⏭️  Exists: {skipped}")
    print(f"  ❌ Failed: {failed}")
    print(f"  📁 Output : {OUT_DIR}")
    print("=" * 60)

    # Tạo báo cáo CSV
    report_path = OUT_DIR / "download_report.csv"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("id,name,brand,category,flavor,size,status\n")
        for p in products:
            f.write(f"{p['id']},{p['name']},{p['brand']},{p['category']},{p['flavor']},{p['size']},\n")
    print(f"  📄 Report : {report_path}")


if __name__ == "__main__":
    main()
