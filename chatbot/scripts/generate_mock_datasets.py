"""Generate routing-aligned mock datasets (100 records each)."""

from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"

ORDER_SKUS = {
    "SKU-OPTIMUM-NUTRITION-100-GOLD-001",
    "SKU-TRUE-NUTRITION-RBGHSOY-FREE-002",
    "SKU-PREMIER-PROTEIN-CHOCOLATE-MILKSHAKE-003",
    "SKU-MYPROTEIN-IMPACT-WHEY-ISOLATE-004",
    "SKU-NAKED-EGG-WHITE-PROTEIN-005",
    "SKU-ORGAIN-PLANTBASED-PROTEIN-POWDER-006",
    "SKU-BLOOM-WHEY-PROTEIN-ISOLATE-007",
    "SKU-NOW-SPORTS-WHEY-PROTEIN-008",
    "SKU-KLEAN-ATHLETE-KLEAN-ISOLATE-009",
    "SKU-RAW-ORGANIC-GRASSFED-WHEY-010",
    "SKU-DYMATIZE-ISO100-011",
    "SKU-BSN-SYNTHA6-012",
    "SKU-MUSCLETECH-NITROTECH-013",
    "SKU-GHOST-WHEY-PROTEIN-014",
    "SKU-RULE-1-R1-PROTEIN-015",
}

WHEY_BRANDS = [
    "Optimum Nutrition",
    "MyProtein",
    "Dymatize",
    "MuscleTech",
    "BSN",
    "Ghost",
    "Rule 1",
    "True Nutrition",
    "Premier Protein",
    "Naked Nutrition",
    "Orgain",
    "Bloom",
    "NOW Sports",
    "Klean Athlete",
    "RAW Nutrition",
    "Scitec Nutrition",
    "Nutrex Research",
    "Cellucor",
    "Isopure",
    "Legion Athletics",
    "Transparent Labs",
    "PEScience",
    "Redcon1",
    "Ryse Supplements",
    "Nutrabio",
]

CREATINE_BRANDS = [
    "Optimum Nutrition",
    "MyProtein",
    "MuscleTech",
    "Dymatize",
    "BSN",
    "Cellucor",
    "Nutrex Research",
    "Kaged Muscle",
    "Thorne",
    "NOW Sports",
    "Bulk",
    "Applied Nutrition",
    "Scitec Nutrition",
    "Universal Nutrition",
    "AllMax Nutrition",
    "Mutant",
    "GAT Sport",
    "ProSupps",
    "Evlution Nutrition",
    "Beast Sports",
    "Rule 1",
    "Redcon1",
    "Transparent Labs",
    "Nutrabio",
    "PEScience",
]

VITAMIN_BCAA_BRANDS = [
    "Optimum Nutrition",
    "MyProtein",
    "Scivation",
    "Xtend",
    "Cellucor",
    "MuscleTech",
    "BSN",
    "Universal Nutrition",
    "NOW Foods",
    "Thorne",
    "Garden of Life",
    "Nature Made",
    "Solgar",
    "Jarrow Formulas",
    "Life Extension",
    "Nutrex Research",
    "Evlution Nutrition",
    "Redcon1",
    "Rule 1",
    "Ghost",
    "Applied Nutrition",
    "Bulk",
    "Nutrabio",
    "PEScience",
    "Transparent Labs",
]

PREWORKOUT_BRANDS = [
    "C4",
    "Cellucor",
    "Ghost",
    "Redcon1",
    "Ryse Supplements",
    "Nutrex Research",
    "MuscleTech",
    "BSN",
    "Optimum Nutrition",
    "MyProtein",
    "Evlution Nutrition",
    "ProSupps",
    "Kaged Muscle",
    "Rule 1",
    "Transparent Labs",
    "PEScience",
    "Nutrabio",
    "Applied Nutrition",
    "Bulk",
    "Scitec Nutrition",
    "Universal Nutrition",
    "Mutant",
    "GAT Sport",
    "AllMax Nutrition",
    "Beast Sports",
]

FLAVORS = [
    "Chocolate",
    "Vanilla",
    "Strawberry",
    "Cookies & Cream",
    "Rocky Road",
    "Unflavored",
    "Fruit Punch",
    "Blue Raspberry",
    "Mango",
    "Lemon Lime",
    "Watermelon",
    "Grape",
    "Peach Mango",
    "Tropical Punch",
    "Sour Apple",
]

ORIGINS = ["USA", "UK", "Canada", "Germany", "Hungary", "Anh Quốc", "Úc", "New Zealand"]

STORE_NAME = "FitStore Vietnam"
STORE_PHONE = "1900 6868"
STORE_EMAIL = "hotro@fitstore.vn"


def _slug(text: str) -> str:
    return (
        text.upper()
        .replace(" ", "-")
        .replace("&", "AND")
        .replace("/", "-")
        .replace("'", "")
        .replace(".", "")
    )


def _load_existing_products() -> list[dict]:
    path = DATA_DIR / "products.json"
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _normalize_whey_product(p: dict, idx: int) -> dict:
    """Keep order-linked SKUs; remap category to whey_protein."""
    out = dict(p)
    out["category"] = "whey_protein"
    if not out.get("product_url"):
        slug = out["sku"].replace("SKU-", "").lower()
        out["product_url"] = f"https://fitstore.vn/san-pham/{slug}"
    if not out.get("image_url"):
        out["image_url"] = f"https://cdn.fitstore.vn/products/{out['sku'].lower()}.jpg"
    return out


def _make_whey(idx: int, brand: str, flavor: str) -> dict:
    whey_types = ["WPI", "WPC", "Whey Blend", "Hydrolyzed Whey", "Whey Protein Isolate"]
    whey_type = whey_types[idx % len(whey_types)]
    weight = random.choice([0.9, 1.0, 1.8, 2.0, 2.27, 2.5, 4.5])
    serving = random.choice([25, 28, 30, 31, 33, 34, 39])
    servings = max(20, int(weight * 1000 / serving))
    sku = f"SKU-{_slug(brand)}-WHEY-{idx:03d}"
    name = f"{brand} Whey Protein {weight}kg {flavor}"
    short = (
        f"Bột whey protein {flavor.lower()} từ {brand}, nền {whey_type}, "
        f"hỗ trợ bổ sung protein sau tập. Hộp {weight}kg, khẩu phần {serving}g, "
        f"khoảng {servings} lần dùng. Xuất xứ {ORIGINS[idx % len(ORIGINS)]}."
    )
    return {
        "sku": sku,
        "name": name,
        "brand": brand,
        "category": "whey_protein",
        "price": random.randrange(650000, 2200000, 50000),
        "weight": weight,
        "flavor": flavor,
        "whey_type": whey_type,
        "lactose_note": random.choice(["Contains lactose", "Lactose-free", "Low lactose"]),
        "origin_country": ORIGINS[idx % len(ORIGINS)],
        "serving_size_g": serving,
        "servings_per_container": servings,
        "product_url": f"https://fitstore.vn/san-pham/{sku.replace('SKU-', '').lower()}",
        "image_url": f"https://cdn.fitstore.vn/products/{sku.lower()}.jpg",
        "short_desc": short,
    }


def _make_creatine(idx: int, brand: str, flavor: str) -> dict:
    forms = ["Creatine Monohydrate", "Micronized Creatine", "Creapure Creatine", "Creatine HCl"]
    form = forms[idx % len(forms)]
    weight = random.choice([0.3, 0.5, 1.0])
    serving = random.choice([3, 5])
    servings = max(30, int(weight * 1000 / serving))
    sku = f"SKU-{_slug(brand)}-CREATINE-{idx:03d}"
    name = f"{brand} {form} {weight}kg {flavor}"
    short = (
        f"Creatine {form.lower()} vị {flavor.lower()} của {brand}, hỗ trợ sức mạnh và hiệu suất tập luyện. "
        f"Hộp {weight}kg, mỗi lần {serving}g, khoảng {servings} liều. "
        f"Xuất xứ {ORIGINS[idx % len(ORIGINS)]}."
    )
    return {
        "sku": sku,
        "name": name,
        "brand": brand,
        "category": "creatine",
        "price": random.randrange(250000, 950000, 25000),
        "weight": weight,
        "flavor": flavor,
        "whey_type": None,
        "lactose_note": "N/A",
        "origin_country": ORIGINS[idx % len(ORIGINS)],
        "serving_size_g": serving,
        "servings_per_container": servings,
        "product_url": f"https://fitstore.vn/san-pham/{sku.replace('SKU-', '').lower()}",
        "image_url": f"https://cdn.fitstore.vn/products/{sku.lower()}.jpg",
        "short_desc": short,
    }


def _make_vitamin_bcaa(idx: int, brand: str, flavor: str) -> dict:
    kinds = [
        "BCAA 2:1:1 Powder",
        "Essential Amino EAAs",
        "Daily Multivitamin Sport",
        "Vitamin D3 + K2",
        "Omega-3 Fish Oil",
        "ZMA Recovery",
        "Electrolyte Hydration",
        "Collagen Peptides",
    ]
    kind = kinds[idx % len(kinds)]
    weight = random.choice([0.25, 0.3, 0.5, 0.6, 1.0])
    serving = random.choice([5, 7, 10, 12, 15])
    servings = max(20, int(weight * 1000 / serving))
    sku = f"SKU-{_slug(brand)}-VITBCAA-{idx:03d}"
    name = f"{brand} {kind} {weight}kg {flavor}"
    short = (
        f"{kind} vị {flavor.lower()} từ {brand}, bổ sung vi chất và hỗ trợ phục hồi cho người tập gym. "
        f"Hộp {weight}kg, khẩu phần {serving}g, khoảng {servings} lần dùng. "
        f"Xuất xứ {ORIGINS[idx % len(ORIGINS)]}."
    )
    return {
        "sku": sku,
        "name": name,
        "brand": brand,
        "category": "vitamin_bcaa",
        "price": random.randrange(320000, 1200000, 20000),
        "weight": weight,
        "flavor": flavor,
        "whey_type": None,
        "lactose_note": "N/A",
        "origin_country": ORIGINS[idx % len(ORIGINS)],
        "serving_size_g": serving,
        "servings_per_container": servings,
        "product_url": f"https://fitstore.vn/san-pham/{sku.replace('SKU-', '').lower()}",
        "image_url": f"https://cdn.fitstore.vn/products/{sku.lower()}.jpg",
        "short_desc": short,
    }


def _make_preworkout(idx: int, brand: str, flavor: str) -> dict:
    types = ["Pre-Workout Stim", "Pre-Workout Non-Stim", "Pump Formula", "Energy + Focus"]
    ptype = types[idx % len(types)]
    weight = random.choice([0.3, 0.45, 0.5, 0.6])
    serving = random.choice([8, 10, 12, 15])
    servings = max(20, int(weight * 1000 / serving))
    sku = f"SKU-{_slug(brand)}-PREWO-{idx:03d}"
    name = f"{brand} {ptype} {weight}kg {flavor}"
    short = (
        f"{ptype} vị {flavor.lower()} của {brand}, hỗ trợ năng lượng và tập trung trước buổi tập. "
        f"Hộp {weight}kg, mỗi lần {serving}g, khoảng {servings} liều. "
        f"Xuất xứ {ORIGINS[idx % len(ORIGINS)]}."
    )
    return {
        "sku": sku,
        "name": name,
        "brand": brand,
        "category": "pre_workout",
        "price": random.randrange(450000, 1450000, 25000),
        "weight": weight,
        "flavor": flavor,
        "whey_type": None,
        "lactose_note": "N/A",
        "origin_country": ORIGINS[idx % len(ORIGINS)],
        "serving_size_g": serving,
        "servings_per_container": servings,
        "product_url": f"https://fitstore.vn/san-pham/{sku.replace('SKU-', '').lower()}",
        "image_url": f"https://cdn.fitstore.vn/products/{sku.lower()}.jpg",
        "short_desc": short,
    }


def generate_products() -> list[dict]:
    random.seed(42)
    existing = {p["sku"]: p for p in _load_existing_products()}
    products: list[dict] = []

    for sku in sorted(ORDER_SKUS):
        if sku in existing:
            products.append(_normalize_whey_product(existing[sku], len(products) + 1))

    whey_needed = 25 - len(products)
    creatine_needed = 25
    vitamin_needed = 25
    preworkout_needed = 25

    used_names: set[str] = {p["name"] for p in products}
    used_descs: set[str] = {p["short_desc"] for p in products}
    used_skus: set[str] = {p["sku"] for p in products}

    def add_product(p: dict) -> None:
        if p["sku"] in used_skus or p["name"] in used_names or p["short_desc"] in used_descs:
            raise ValueError(f"Duplicate product: {p['sku']}")
        products.append(p)
        used_names.add(p["name"])
        used_descs.add(p["short_desc"])
        used_skus.add(p["sku"])

    idx = 100
    for i in range(whey_needed):
        brand = WHEY_BRANDS[(i + 15) % len(WHEY_BRANDS)]
        flavor = FLAVORS[i % len(FLAVORS)]
        add_product(_make_whey(idx + i, brand, flavor))

    idx = 200
    for i in range(creatine_needed):
        brand = CREATINE_BRANDS[i % len(CREATINE_BRANDS)]
        flavor = FLAVORS[(i + 3) % len(FLAVORS)]
        add_product(_make_creatine(idx + i, brand, flavor))

    idx = 300
    for i in range(vitamin_needed):
        brand = VITAMIN_BCAA_BRANDS[i % len(VITAMIN_BCAA_BRANDS)]
        flavor = FLAVORS[(i + 5) % len(FLAVORS)]
        add_product(_make_vitamin_bcaa(idx + i, brand, flavor))

    idx = 400
    for i in range(preworkout_needed):
        brand = PREWORKOUT_BRANDS[i % len(PREWORKOUT_BRANDS)]
        flavor = FLAVORS[(i + 7) % len(FLAVORS)]
        add_product(_make_preworkout(idx + i, brand, flavor))

    if len(products) != 100:
        raise ValueError(f"Expected 100 products, got {len(products)}")
    return products


def _date_offset(base: date, days: int) -> str:
    return (base - timedelta(days=days)).isoformat()


def generate_nutrition() -> list[dict]:
    topics = [
        ("whey là gì", "Whey protein là phần whey tách từ sữa, giàu protein và axit amin thiết yếu."),
        ("whey isolate vs concentrate", "Whey isolate lọc cao hơn, ít lactose và carb hơn whey concentrate."),
        ("thời điểm uống whey", "Whey thường dùng sau tập hoặc giữa bữa để bổ sung protein."),
        ("liều whey mỗi ngày", "Liều phổ biến 20–40g protein từ whey tùy cân nặng và mục tiêu tập luyện."),
        ("whey có lactose không", "Whey concentrate thường còn lactose; isolate/hydrolyzed thường ít lactose hơn."),
        ("whey với sữa hay nước", "Pha nước giảm calo; pha sữa tăng protein và vị béo ngậy hơn."),
        ("whey trước khi ngủ", "Casein phù hợp hơn trước ngủ; whey hấp thu nhanh nên ưu tiên sau tập."),
        ("whey khi giảm cân", "Whey hỗ trợ đạt đủ protein, giữ cơ khi ăn thâm hụt calo."),
        ("whey khi tăng cân", "Kết hợp whey với bữa phụ hoặc gainer để tăng tổng calo và protein."),
        ("creatine là gì", "Creatine monohydrate hỗ trợ tái tạo ATP, cải thiện sức mạnh ngắn hạn."),
    ]
    brands = WHEY_BRANDS[:10]
    items: list[dict] = []
    base = date(2026, 5, 26)
    for i in range(100):
        topic_idx = i % len(topics)
        key, base_answer = topics[topic_idx]
        brand = brands[i % len(brands)]
        q_templates = [
            f"{key} và cách dùng cho người mới tập?",
            f"Khác biệt {key} giữa các dòng whey phổ biến?",
            f"{brand} có phù hợp nếu hỏi về {key}?",
            f"Một ngày nên bao nhiêu liều khi tìm hiểu {key}?",
            f"Có nên kết hợp BCAA khi học về {key}?",
        ]
        question = f"[{i + 1:03d}] {q_templates[i % len(q_templates)].capitalize()}"
        answer = (
            f"Dạ {base_answer} Tại {STORE_NAME}, khách tham khảo thêm nhãn sản phẩm {brand} "
            f"và điều chỉnh theo mục tiêu cá nhân; đây là thông tin dinh dưỡng thể thao chung, "
            f"không thay thế tư vấn y tế ạ."
        )
        tags = ["nutrition", "whey", key.split()[0]]
        if "creatine" in key:
            tags = ["nutrition", "creatine"]
        if i % 7 == 0:
            tags.append("bcaa")
        items.append(
            {
                "question": question,
                "answer": answer,
                "tags": tags,
                "updated_at": _date_offset(base, i % 60),
            }
        )
    return items


def generate_policy() -> list[dict]:
    templates = [
        ("Thời gian giao hàng nội thành {city}?", "Dạ nội thành {city} giao dự kiến 1–2 ngày làm việc ạ."),
        ("Phí ship đơn hàng dưới {amount}đ?", "Dạ đơn dưới {amount}đ áp dụng phí ship theo bảng giá tại bước thanh toán ạ."),
        ("Đơn trên {amount}đ có miễn phí vận chuyển không?", "Dạ đơn từ {amount}đ trở lên được miễn phí ship nội thành ạ."),
        ("Chính sách đổi trả hàng lỗi sản xuất?", "Dạ sản phẩm lỗi NSX được đổi mới trong 7 ngày khi còn tem ạ."),
        ("Thanh toán chuyển khoản có giảm giá không?", "Dạ chuyển khoản có thể được giảm thêm theo chương trình tại thời điểm đặt ạ."),
        ("Có hỗ trợ COD toàn quốc không?", "Dạ {STORE} hỗ trợ COD tại hầu hết tỉnh thành, trừ vùng hạn chế của đơn vị vận chuyển ạ."),
        ("Làm sao tra mã vận đơn?", "Dạ sau khi xuất kho, hệ thống gửi SMS/email mã vận đơn để tra cứu ạ."),
        ("Giao hàng cuối tuần có được không?", "Dạ giao cuối tuần tùy khu vực và đơn vị vận chuyển ạ."),
        ("Đổi địa chỉ sau khi đặt hàng?", "Dạ liên hệ hotline {phone} trong 2 giờ sau đặt để đổi địa chỉ ạ."),
        ("Hoàn tiền khi hủy đơn?", "Dạ đơn chưa xuất kho được hoàn trong 3–7 ngày làm việc ạ."),
    ]
    cities = ["Hà Nội", "TP.HCM", "Đà Nẵng", "Cần Thơ", "Hải Phòng"]
    amounts = [500000, 700000, 800000, 1000000, 1200000]
    items: list[dict] = []
    base = date(2026, 5, 26)
    for i in range(100):
        tpl = templates[i % len(templates)]
        city = cities[i % len(cities)]
        amount = amounts[i % len(amounts)]
        q = f"[{i + 1:03d}] " + tpl[0].format(
            city=city, amount=f"{amount:,}".replace(",", "."), STORE=STORE_NAME
        )
        a = tpl[1].format(
            city=city, amount=f"{amount:,}".replace(",", "."), STORE=STORE_NAME, phone=STORE_PHONE
        )
        tag_sets = [
            ["shipping", "delivery"],
            ["shipping", "fee"],
            ["returns", "policy"],
            ["payment", "cod"],
            ["payment", "bank"],
            ["order", "tracking"],
            ["returns", "refund"],
        ]
        items.append(
            {
                "question": q,
                "answer": a,
                "tags": tag_sets[i % len(tag_sets)],
                "updated_at": _date_offset(base, i % 45),
            }
        )
    return items


def generate_general() -> list[dict]:
    templates = [
        ("Giờ mở cửa showroom {city}?", "Dạ showroom {city} mở 9:00–21:00 hằng ngày ạ."),
        ("Hotline {STORE} là gì?", "Dạ hotline {phone}, email {email} ạ."),
        ("Chương trình tích điểm thành viên?", "Dạ mỗi 10.000đ tích 1 điểm, 100 điểm giảm 50.000đ ạ."),
        ("Có tư vấn online qua Zalo không?", "Dạ có, quét QR Zalo trên website hoặc nhắn fanpage ạ."),
        ("Showroom có bán thử mẫu whey không?", "Dạ một số mùi có mẫu thử tại quầy, tùy tồn kho ạ."),
        ("Có hóa đơn VAT công ty không?", "Dạ hỗ trợ xuất VAT khi khách cung cấp thông tin trước 17:00 cùng ngày ạ."),
        ("Ứng dụng mobile của {STORE}?", "Dạ app FitStore có trên iOS/Android để theo dõi đơn và ưu đãi ạ."),
        ("Chính sách bảo mật thông tin khách?", "Dạ {STORE} không chia sẻ dữ liệu cá nhân cho bên thứ ba marketing ạ."),
        ("Có workshop dinh dưỡng miễn phí không?", "Dạ tổ chức workshop online hàng tháng, đăng ký qua fanpage ạ."),
        ("Liên hệ hợp tác affiliate?", "Dạ gửi email {email} tiêu đề 'Affiliate' để được tư vấn ạ."),
    ]
    cities = ["Hà Nội", "TP.HCM", "Đà Nẵng"]
    items: list[dict] = []
    base = date(2026, 5, 26)
    for i in range(100):
        tpl = templates[i % len(templates)]
        city = cities[i % len(cities)]
        q = f"[{i + 1:03d}] " + tpl[0].format(
            city=city, STORE=STORE_NAME, phone=STORE_PHONE, email=STORE_EMAIL
        )
        a = tpl[1].format(city=city, STORE=STORE_NAME, phone=STORE_PHONE, email=STORE_EMAIL)
        tag_sets = [
            ["store", "hours"],
            ["contact", "support"],
            ["loyalty", "membership"],
            ["general", "faq"],
            ["store", "showroom"],
        ]
        items.append(
            {
                "question": q,
                "answer": a,
                "tags": tag_sets[i % len(tag_sets)],
                "updated_at": _date_offset(base, i % 30),
            }
        )
    return items


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    products = generate_products()
    nutrition = generate_nutrition()
    policy = generate_policy()
    general = generate_general()

    (DATA_DIR / "products.json").write_text(
        json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (DATA_DIR / "nutrition.json").write_text(
        json.dumps(nutrition, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (DATA_DIR / "faq_policy.json").write_text(
        json.dumps(policy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (DATA_DIR / "general.json").write_text(
        json.dumps(general, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"Wrote {len(products)} products")
    print(f"Wrote {len(nutrition)} nutrition items")
    print(f"Wrote {len(policy)} policy items")
    print(f"Wrote {len(general)} general items")


if __name__ == "__main__":
    main()
