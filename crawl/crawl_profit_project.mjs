/**
 * ProFit - Project Data Crawler
 * =============================
 * Trích xuất toàn bộ dữ liệu sản phẩm + ảnh từ project ProFit hiện có.
 *
 * Nguồn dữ liệu (READ-ONLY, KHÔNG sửa / KHÔNG xóa gì trong project):
 *   1. Database MySQL `ProFitSuppsDB`:
 *        - categories
 *        - products (id, sku, slug, name, short_description, description,
 *                   price, old_price, rating_avg, rating_count,
 *                   stock_quantity, is_active, created_at, updated_at, category_id)
 *        - product_images (image_url, sort_order, is_primary)
 *        - product_tags + product_tag_map
 *
 *   2. File ảnh gốc của project:
 *        backend/src/main/resources/static/uploads/products/image-{id}.jpg
 *      (ĐƯỢC COPY sang folder mới, file gốc KHÔNG bị động vào)
 *
 * Output (folder crawl/output - tách biệt hoàn toàn với project):
 *   output/products.csv          : toàn bộ SP, header khớp API backend
 *   output/categories.csv        : 4 danh mục
 *   output/product_images.csv    : mapping product -> image
 *   output/crawl_summary.json    : tóm tắt + timestamp
 *   output/images/<id>_<slug>/   : ảnh từng SP (1.jpg, 2.jpg, ...)
 *   output/crawl.log             : log quá trình
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFIT_ROOT = path.resolve(__dirname, "..");             // c:\Users\Admin\profit_new\profit
const BACKEND_UPLOADS = path.join(PROFIT_ROOT, "backend", "src", "main", "resources", "static", "uploads", "products");
const OUT_DIR = path.join(__dirname, "output");
const IMG_DIR = path.join(OUT_DIR, "images");
const LOG_FILE = path.join(OUT_DIR, "crawl.log");
const CSV_PRODUCTS = path.join(OUT_DIR, "products.csv");
const CSV_CATEGORIES = path.join(OUT_DIR, "categories.csv");
const CSV_PRODUCT_IMAGES = path.join(OUT_DIR, "product_images.csv");
const JSON_SUMMARY = path.join(OUT_DIR, "crawl_summary.json");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// DB CONFIG (lấy từ application-local.yaml)
// ---------------------------------------------------------------------------
const DB_CONFIG = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "root",
  database: "profitsuppsdb",
  charset: "utf8mb4",
};

// ---------------------------------------------------------------------------
// LOGGING
// ---------------------------------------------------------------------------
const logLines = [];
function ts() { return new Date().toISOString().replace("T", " ").slice(0, 19); }
function log(level, msg) {
  const line = `${ts()} | ${level.padEnd(5)} | ${msg}`;
  console.log(line);
  logLines.push(line);
}
const info  = (m) => log("INFO", m);
const warn  = (m) => log("WARN", m);
const err   = (m) => log("ERROR", m);
async function flushLog() { await fsp.appendFile(LOG_FILE, logLines.join("\n") + "\n"); }

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return `"${s.replace(/"/g, '""')}"`;
}
function writeCsv(filePath, fields, rows) {
  const BOM = "\uFEFF"; // UTF-8 BOM -> Excel mở OK tiếng Việt
  const header = fields.map(csvEscape).join(",") + "\r\n";
  const body = rows.map(r => fields.map(f => csvEscape(r[f])).join(",")).join("\r\n");
  fs.writeFileSync(filePath, BOM + header + body, "utf8");
}

// ---------------------------------------------------------------------------
// Slug -> folder name (giữ ID để tránh trùng slug)
// ---------------------------------------------------------------------------
function safeFolderName(id, slug) {
  const clean = (slug || `product-${id}`).toString()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${String(id).padStart(3, "0")}_${clean || "product"}`;
}

// ---------------------------------------------------------------------------
// Image copy + re-encode JPEG (giữ nguyên cấu trúc nếu đã là JPEG)
// ---------------------------------------------------------------------------
async function copyImageAsJpg(srcPath, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    return { bytes: fs.statSync(destPath).size, status: "skipped" };
  }
  try {
    const buf = await fsp.readFile(srcPath);
    const jpg = await sharp(buf)
      .rotate()                 // honor EXIF orientation
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    await fsp.writeFile(destPath, jpg);
    return { bytes: jpg.length, status: "ok" };
  } catch (e) {
    return { bytes: 0, status: `error: ${e.message}` };
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  info("=".repeat(72));
  info("ProFit project crawler (READ-ONLY, project source untouched)");
  info("=".repeat(72));
  info(`Project root : ${PROFIT_ROOT}`);
  info(`Backend uploads: ${BACKEND_UPLOADS}`);
  info(`Output dir    : ${OUT_DIR}`);

  // -----------------------------------------------------------------------
  // 1. Connect DB
  // -----------------------------------------------------------------------
  info("Connecting to MySQL ProFitSuppsDB...");
  const conn = await mysql.createConnection(DB_CONFIG);
  info("  -> connected");

  // -----------------------------------------------------------------------
  // 2. Categories
  // -----------------------------------------------------------------------
  const [categories] = await conn.query(
    `SELECT id, parent_id, name, slug, is_active
       FROM categories
       WHERE deleted_at IS NULL
       ORDER BY id ASC`
  );
  info(`Categories: ${categories.length}`);

  // -----------------------------------------------------------------------
  // 3. Products + tags + primary image
  // -----------------------------------------------------------------------
  const [products] = await conn.query(
    `SELECT p.id, p.category_id, p.sku, p.slug, p.name,
            p.short_description, p.description,
            p.price, p.old_price, p.rating_avg, p.rating_count,
            p.stock_quantity, p.is_active, p.created_at, p.updated_at,
            c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.id ASC`
  );
  info(`Products: ${products.length}`);

  // Tags
  const [tagMap] = await conn.query(
    `SELECT m.product_id, t.code, t.display_name
       FROM product_tag_map m
       JOIN product_tags t ON t.id = m.tag_id`
  );
  const tagsByProduct = new Map();
  for (const row of tagMap) {
    if (!tagsByProduct.has(row.product_id)) tagsByProduct.set(row.product_id, []);
    tagsByProduct.get(row.product_id).push(row.display_name);
  }

  // All images per product (giữ thứ tự sort_order, is_primary desc)
  const [imageRows] = await conn.query(
    `SELECT product_id, image_url, sort_order, is_primary
       FROM product_images
       ORDER BY product_id ASC, is_primary DESC, sort_order ASC, id ASC`
  );
  const imagesByProduct = new Map();
  for (const row of imageRows) {
    if (!imagesByProduct.has(row.product_id)) imagesByProduct.set(row.product_id, []);
    imagesByProduct.get(row.product_id).push(row);
  }
  info(`Product-image mappings: ${imageRows.length}`);

  // -----------------------------------------------------------------------
  // 4. Copy ảnh từ backend/static/uploads/products/ -> output/images/<id>_<slug>/
  // -----------------------------------------------------------------------
  info("Copying images from backend (read-only)...");
  const imageCopyStats = [];
  let totalBytes = 0;
  for (const p of products) {
    const images = imagesByProduct.get(p.id) || [];
    if (!images.length) continue;
    const folder = safeFolderName(p.id, p.slug);
    const productDir = path.join(IMG_DIR, folder);
    fs.mkdirSync(productDir, { recursive: true });

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      // /uploads/products/image-N.jpg -> backend/src/main/resources/static/uploads/products/image-N.jpg
      const filename = path.basename(img.image_url);
      const srcPath = path.join(BACKEND_UPLOADS, filename);
      const destPath = path.join(productDir, `${i + 1}.jpg`);
      if (!fs.existsSync(srcPath)) {
        warn(`  Missing source image: ${srcPath}`);
        imageCopyStats.push({ product_id: p.id, src: srcPath, dest: destPath, status: "missing" });
        continue;
      }
      const r = await copyImageAsJpg(srcPath, destPath);
      totalBytes += r.bytes;
      imageCopyStats.push({ product_id: p.id, src: filename, dest: `${folder}/${i + 1}.jpg`, status: r.status, bytes: r.bytes });
    }
  }
  const ok = imageCopyStats.filter(s => s.status === "ok" || s.status === "skipped").length;
  info(`  -> ${ok}/${imageCopyStats.length} images copied (${(totalBytes / 1024).toFixed(1)} KB total)`);

  // -----------------------------------------------------------------------
  // 5. Build CSV rows
  // -----------------------------------------------------------------------
  const productRows = products.map(p => {
    const imgs = imagesByProduct.get(p.id) || [];
    const primary = imgs[0]; // is_primary desc, sort_order asc
    const localFolder = safeFolderName(p.id, p.slug);
    const localImageCount = imgs.length;
    const imageFilenames = imgs.map((_, i) => `${i + 1}.jpg`).join("|");
    return {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      category_id: p.category_id,
      category_name: p.category_name || "",
      category_slug: p.category_slug || "",
      short_description: p.short_description || "",
      description: p.description || "",
      price: p.price,
      old_price: p.old_price,
      rating_avg: p.rating_avg,
      rating_count: p.rating_count,
      stock_quantity: p.stock_quantity,
      is_active: p.is_active,
      tags: (tagsByProduct.get(p.id) || []).join(", "),
      primary_image_url: primary ? primary.image_url : "",
      primary_image_filename: primary ? "1.jpg" : "",
      image_count: localImageCount,
      local_folder: localImageCount > 0 ? localFolder : "",
      local_image_files: imageFilenames,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  });

  const productImageRows = imageCopyStats
    .filter(s => s.status !== "missing")
    .map(s => ({
      product_id: s.product_id,
      source_file: s.src,
      local_path: s.dest,
      bytes: s.bytes,
      status: s.status,
    }));

  // -----------------------------------------------------------------------
  // 6. Write outputs
  // -----------------------------------------------------------------------
  writeCsv(CSV_PRODUCTS, [
    "id", "sku", "slug", "name",
    "category_id", "category_name", "category_slug",
    "short_description", "description",
    "price", "old_price",
    "rating_avg", "rating_count",
    "stock_quantity", "is_active",
    "tags",
    "primary_image_url", "primary_image_filename",
    "image_count", "local_folder", "local_image_files",
    "created_at", "updated_at",
  ], productRows);
  info(`Wrote products.csv (${productRows.length} rows)`);

  writeCsv(CSV_CATEGORIES, ["id", "parent_id", "name", "slug", "is_active"], categories);
  info(`Wrote categories.csv (${categories.length} rows)`);

  writeCsv(CSV_PRODUCT_IMAGES,
    ["product_id", "source_file", "local_path", "bytes", "status"],
    productImageRows);
  info(`Wrote product_images.csv (${productImageRows.length} rows)`);

  const summary = {
    crawled_at: new Date().toISOString(),
    source: {
      project_root: PROFIT_ROOT,
      db: `mysql://${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`,
      images: BACKEND_UPLOADS,
      mode: "READ-ONLY (project source files NOT modified)",
    },
    counts: {
      categories: categories.length,
      products: products.length,
      images_total: imageCopyStats.length,
      images_copied: imageCopyStats.filter(s => s.status === "ok").length,
      images_skipped: imageCopyStats.filter(s => s.status === "skipped").length,
      images_missing: imageCopyStats.filter(s => s.status === "missing").length,
      total_bytes: totalBytes,
    },
    outputs: {
      products_csv: CSV_PRODUCTS,
      categories_csv: CSV_CATEGORIES,
      product_images_csv: CSV_PRODUCT_IMAGES,
      images_dir: IMG_DIR,
    },
  };
  fs.writeFileSync(JSON_SUMMARY, JSON.stringify(summary, null, 2), "utf8");
  info(`Wrote crawl_summary.json`);

  await conn.end();
  info("=".repeat(72));
  info("DONE.");
  info(`  products: ${products.length}`);
  info(`  images  : ${summary.counts.images_copied}/${imageCopyStats.length} copied (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
  info(`  output  : ${OUT_DIR}`);
  info("=".repeat(72));

  await flushLog();
}

main().then(() => process.exit(0)).catch(async (e) => {
  err(`Fatal: ${e.stack || e.message}`);
  await flushLog();
  process.exit(1);
});
