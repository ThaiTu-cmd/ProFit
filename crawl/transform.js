/**
 * Transform: products.csv -> 4 file JSON đúng schema sample
 * =================================================================
 * Đọc products.csv (đã crawl từ project ProFit) và sinh ra 4 file JSON
 * theo đúng cấu trúc của các file sample trong "phân tích dữ liệu":
 *   - creatine_samples.json
 *   - preworkout_samples.json
 *   - protein_bar_samples.json
 *   - whey_protein_samples.json
 *
 * Output giữ nguyên VND (giá), kg (trọng lượng), flavor bịa (xoay vòng
 * từ pool), description lấy từ cột description trong CSV.
 *
 * Cách dùng:
 *   node transform.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// PATHS
// ---------------------------------------------------------------------------
const CSV_PATH = path.join(__dirname, "output", "products.csv");
const OUT_DIR  = path.join(__dirname, "..", "phân tích dữ liệu");

// ---------------------------------------------------------------------------
// CATEGORY ROUTING: ProFit category_id -> output file + schema
// ---------------------------------------------------------------------------
const CATEGORY_MAP = {
  1: {
    file: "whey_protein_samples.json",
    category: "whey_protein",
    type: "whey",
  },
  2: {
    file: "preworkout_samples.json",
    category: "preworkout",
    type: "preworkout",
  },
  3: {
    file: "protein_bar_samples.json",
    category: "protein_bar",
    type: "bar",
  },
  4: {
    file: "creatine_samples.json",
    category: "creatine",
    type: "creatine",
  },
};

// ---------------------------------------------------------------------------
// FLAVOR POOLS (xoay vòng theo index để deterministic)
// ---------------------------------------------------------------------------
const FLAVOR_POOLS = {
  whey: [
    "Double Rich Chocolate", "Vanilla Ice Cream", "Cookies & Cream",
    "Strawberry", "Banana Cream", "Salted Caramel", "Chocolate Mint",
    "Mocha Cappuccino", "Mango Peach", "Chocolate Peanut Butter",
    "Rocky Road", "Peanut Butter", "Coconut", "Chocolate Hazelnut",
    "Unflavored",
  ],
  preworkout: [
    "Blue Raspberry", "Watermelon", "Fruit Punch", "Sour Gummy",
    "Blueberry Lemonade", "Pink Lemonade", "Tropical Storm",
    "Mango Burst", "Grape", "Green Apple", "Cherry Limeade",
    "Pineapple Coconut", "Orange Burst", "Rocket Pop",
  ],
  bar: [
    "Chocolate Chip Cookie Dough", "Cookies & Cream", "Birthday Cake",
    "Salty Peanut", "Brownie", "Chocolate Brownie", "Peanut Butter",
    "Caramel Pecan", "Lemon Cake", "Cinnamon Roll", "Salted Caramel",
    "Chocolate Peanut Butter", "Double Chocolate Chunk", "Strawberry",
    "Vanilla",
  ],
  creatine: ["Unflavored", "Watermelon", "Blue Raspberry", "Lemon Lime",
             "Fruit Punch", "Cherry"],
};

// Origin rotation (mỗi SP quay 1 nước khác nhau cho đa dạng, dù không bắt buộc)
const ORIGINS = ["USA", "UK", "Australia", "Netherlands", "Ireland", "Canada", "Germany"];

// ---------------------------------------------------------------------------
// WEIGHT + SERVINGS PARSING FROM NAME
// ---------------------------------------------------------------------------

// "5lbs", "4.5lbs", "1kg", "600g", "250g" -> kg
function parseWeightFromName(name) {
  const t = name.toLowerCase();
  // lbs trước (chuẩn supplement Mỹ)
  const lb = t.match(/(\d+(?:\.\d+)?)\s*lbs?\b/);
  if (lb) return Math.round(parseFloat(lb[1]) * 0.453592 * 1000) / 1000;
  // kg
  const kg = t.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (kg) return parseFloat(kg[1]);
  // grams
  const g = t.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (g) return Math.round(parseFloat(g[1]) / 1000 * 1000) / 1000;
  // Serving dạng count: nếu tên chỉ có "30 servings" thì ~7g/serving * count
  const servOnly = t.match(/^(\d+)\s*serv(?:ings?)?\b/);
  if (servOnly) {
    const n = parseInt(servOnly[1]);
    // bar ~ 60g, creatine ~ 5g, preworkout ~ 10g, whey ~ 32g
    // sẽ được estimate riêng ở từng category
    return null;
  }
  return null;
}

// "30 servings", "75 Servings", "60g", "600g" -> servings count
// Với powder/scoop: ước lượng servings = total_g / serving_size_g trong category
function parseServingsFromName(name, categoryType) {
  const t = name.toLowerCase();
  // Serving count trực tiếp
  const m = t.match(/(\d+)\s*serv(?:ings?)?\b/);
  if (m) return parseInt(m[1]);
  // grams -> servings theo category
  const g = t.match(/(\d+)\s*g\b/);
  if (g && !t.includes("lbs") && !t.includes("kg")) {
    const grams = parseInt(g[1]);
    const perServing = { whey: 32, preworkout: 10, creatine: 5, bar: 60 }[categoryType] || 30;
    return Math.max(1, Math.round(grams / perServing));
  }
  // lbs -> servings theo category
  const lb = t.match(/(\d+(?:\.\d+)?)\s*lbs?\b/);
  if (lb) {
    const grams = parseFloat(lb[1]) * 453.592;
    const perServing = { whey: 32, preworkout: 10, creatine: 5, bar: 60 }[categoryType] || 30;
    return Math.max(1, Math.round(grams / perServing));
  }
  return null; // không parse được -> để null
}

// Bar: thường tên có "60g" -> serving_size = 60, servings = 1
function parseBarServing(name) {
  const t = name.toLowerCase();
  const g = t.match(/(\d+)\s*g\b/);
  if (g) return parseInt(g[1]);
  // nếu không có grams, mặc định 60g/thanh
  return 60;
}

// ---------------------------------------------------------------------------
// SERVING SIZE cho attributes theo category
// ---------------------------------------------------------------------------
const DEFAULT_SERVING_SIZE_G = { whey: 32, preworkout: 10, creatine: 5, bar: 60 };

// ---------------------------------------------------------------------------
// ATTRIBUTES SCHEMAS - tạo keys theo schema mẫu
// ---------------------------------------------------------------------------
function buildAttributes(type, row, servings) {
  const commonDietary = ["gluten-free"];
  switch (type) {
    case "whey":
      return {
        protein_source: "whey",
        whey_type: "concentrate",       // default, có thể parse sâu hơn nếu cần
        dietary: commonDietary,
        goals: ["muscle_gain", "recovery"],
        serving_size_g: DEFAULT_SERVING_SIZE_G.whey,
        servings_per_container: servings ?? 30,
      };
    case "preworkout":
      return {
        form: "powder",
        stimulant_level: "high",         // default
        caffeine_per_serving_mg: 200,    // default; nếu parse từ desc thì tốt hơn
        beta_alanine_mg: 3200,
        l_citrulline_mg: 6000,
        contains_creatine: true,
        key_ingredients: ["Caffeine", "Beta-Alanine", "L-Citrulline", "Creatine"],
        serving_size_g: DEFAULT_SERVING_SIZE_G.preworkout,
        servings_per_container: servings ?? 30,
        dietary: ["gluten-free"],
        goals: ["energy", "focus", "pump"],
      };
    case "bar":
      return {
        product_type: "protein_bar",
        protein_source: "whey",
        protein_per_serving_g: 20,
        carbs_per_serving_g: 22,
        fat_per_serving_g: 8,
        calories_per_serving: 200,
        sugar_per_serving_g: 3,
        fiber_per_serving_g: 12,
        serving_size_g: parseBarServing(row.name),
        pieces_per_package: 1,
        texture: "chewy",
        dietary: ["gluten-free"],
        goals: ["recovery", "snack"],
      };
    case "creatine":
      return {
        creatine_type: "creatine_monohydrate",
        form: "powder",
        creatine_per_serving_g: 5,
        purity_percent: 99.9,
        third_party_tested: true,
        serving_size_g: DEFAULT_SERVING_SIZE_G.creatine,
        servings_per_container: servings ?? 60,
        dietary: ["vegan", "gluten-free"],
        goals: ["strength", "muscle_gain"],
      };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// PAGE CONTENT - mô tả dạng tự nhiên (concatenate thông tin)
// ---------------------------------------------------------------------------
function buildPageContent(row, type, flavor, weightKg, servings, country) {
  const name = row.name;
  const cat = { whey: "whey protein", preworkout: "pre-workout",
                bar: "protein bar", creatine: "creatine monohydrate" }[type] || "supplement";
  // Lấy short_description làm phần opening
  const opener = row.short_description || row.description || `${name} chất lượng cao.`;
  return `${name} in ${flavor} is a premium ${cat} from ${country}. ${opener} Each ${DEFAULT_SERVING_SIZE_G[type] || 30}g serving is designed for daily training with ${servings ?? 30} servings per container and a total weight of ${weightKg.toFixed(3)} kg.`;
}

// ---------------------------------------------------------------------------
// CSV PARSER (đơn giản, đủ dùng cho file ProFit có quote-double-quote escape)
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Missing CSV: ${CSV_PATH}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Strip BOM
  let csvText = fs.readFileSync(CSV_PATH, "utf8");
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);

  const rows = parseCsv(csvText).filter(r => r.length > 1 && r.some(c => c !== ""));
  if (rows.length < 2) { console.error("CSV empty"); process.exit(1); }

  const header = rows[0];
  const idx = (name) => header.indexOf(name);
  const dataRows = rows.slice(1).map(r => ({
    id:              r[idx("id")],
    sku:             r[idx("sku")],
    slug:            r[idx("slug")],
    name:            r[idx("name")],
    category_id:     r[idx("category_id")],
    category_name:   r[idx("category_name")],
    category_slug:   r[idx("category_slug")],
    short_description: r[idx("short_description")],
    description:     r[idx("description")],
    price:           r[idx("price")],
    old_price:       r[idx("old_price")],
    rating_avg:      r[idx("rating_avg")],
    rating_count:    r[idx("rating_count")],
    stock_quantity:  r[idx("stock_quantity")],
    is_active:       r[idx("is_active")],
    tags:            r[idx("tags")],
    primary_image_url:    r[idx("primary_image_url")],
    primary_image_filename: r[idx("primary_image_filename")],
    image_count:     r[idx("image_count")],
    local_folder:    r[idx("local_folder")],
    local_image_files: r[idx("local_image_files")],
  }));

  // bucket theo category
  const buckets = { 1: [], 2: [], 3: [], 4: [] };
  for (const r of dataRows) buckets[r.category_id]?.push(r);

  // counters để rotate flavor/origin
  const flavorIdx = { whey: 0, preworkout: 0, bar: 0, creatine: 0 };
  const originIdx = { whey: 0, preworkout: 0, bar: 0, creatine: 0 };

  // counters for id sequence (per-category)
  const seq = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const catId of [1, 2, 3, 4]) {
    const cfg = CATEGORY_MAP[catId];
    const items = buckets[catId];
    const json = [];

    for (const row of items) {
      seq[catId]++;

      // -- flavor (rotate)
      const pool = FLAVOR_POOLS[cfg.type];
      const flavor = pool[flavorIdx[cfg.type] % pool.length];
      flavorIdx[cfg.type]++;

      // -- origin (rotate)
      const origin = ORIGINS[originIdx[cfg.type] % ORIGINS.length];
      originIdx[cfg.type]++;

      // -- weight (kg): parse từ tên; nếu fail -> ước lượng từ servings × perServing
      let weightKg = parseWeightFromName(row.name);
      const servings = parseServingsFromName(row.name, cfg.type);
      if (weightKg == null) {
        const perG = { whey: 32, preworkout: 10, creatine: 5, bar: 60 }[cfg.type] || 30;
        const totalG = (servings ?? 30) * perG;
        weightKg = Math.round(totalG / 1000 * 1000) / 1000;
      }

      // -- price (VND -> USD-ish? KHÔNG. User nói "vẫn xài VND" -> giữ nguyên)
      const priceVnd = parseFloat(row.price);

      // -- id: dùng SKU (option "Dùng nguyên SKU")
      const id = row.sku;

      // -- attributes
      const attrs = buildAttributes(cfg.type, row, servings);

      // -- page_content
      const pageContent = buildPageContent(row, cfg.type, flavor, weightKg, servings, origin);

      // -- image_url & product_url (dùng id gốc để map đúng image-N.jpg từ backend)
      const imageUrl = `https://profit.local/uploads/products/image-${row.id}.jpg`;
      const productUrl = `https://profit.local/products/${row.slug}`;

      json.push({
        id,
        page_content: pageContent,
        metadata: {
          sku: row.sku,
          name: row.name,
          brand: extractBrand(row.name),
          category: cfg.category,
          price: priceVnd,
          weight_kg: weightKg,
          flavor,
          origin_country: origin,
          image_url: imageUrl,
          product_url: productUrl,
        },
        attributes: attrs,
      });
    }

    const outPath = path.join(OUT_DIR, cfg.file);
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2), "utf8");
    console.log(`Wrote ${outPath}  (${json.length} items)`);
  }
}

// Brand = từ đầu tiên của tên trước các brand phổ biến
function extractBrand(name) {
  const words = name.split(/\s+/);
  // Các brand đa từ
  const multi = [
    "Optimum Nutrition", "MuscleTech", "Cellucor", "Dymatize", "MyProtein",
    "Nutricost", "ALLMAX", "Allmax", "Rule 1", "BSN", "Universal Nutrition",
    "BPI Sports", "MusclePharm", "Mutant", "JYM", "GAT Sport", "VPX",
    "Labrada", "APS", "Blackstone Labs", "JNX Sports", "Applied Nutrition",
    "Ghost", "Gaspari", "Nutrex", "BiotechUSA", "PVL", "Scitec",
    "Kaged Muscle", "RSP Nutrition", "Redcon1", "ProSupps", "Alani Nu",
    "Ryse", "Grenade", "Barebells", "Quest Nutrition", "Robert Irvine",
    "ONE Brands", "Insane Labz", "5% Nutrition", "Huge Supplements",
    "GNC", "EVL", "5 Nutrition",
  ];
  for (const m of multi) {
    if (name.toLowerCase().startsWith(m.toLowerCase())) return m;
  }
  // single-word brand = từ đầu tiên
  return words[0];
}

main();
