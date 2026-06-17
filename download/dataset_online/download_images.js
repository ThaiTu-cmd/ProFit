/**
 * download_images.js v3
 * =====================
 * Tải ảnh supplement từ Bing Images + Amazon + Brand sites.
 * Dùng: Node.js (native https/http)
 *
 * Chạy: node download_images.js
 *
 * Cách hoạt động:
 *   1. Bing Images (dễ truy cập, ít chặn bot)
 *   2. Amazon direct CDN
 *   3. Brand chính hãng (ON, Myprotein, Dymatize...)
 *   4. Logo.clearbit.com (fallback)
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');
const { URL } = require('url');

// ── Cấu hình ──────────────────────────────────────────────
const BASE_DIR  = __dirname;
const JSON_PATH = path.join(BASE_DIR, 'products.json');
const OUT_BASE  = path.join(BASE_DIR, 'images');
const TOTAL_RUN = 3;    // test 3 sản phẩm → đổi thành 280 khi chạy thật
const DELAY_MS  = 4000; // 4s delay

// ── HTTP GET ──────────────────────────────────────────────
function httpGet(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const mod = parsed.protocol === 'https:' ? https : http;
        const req = mod.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
            },
            timeout: timeoutMs,
        }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                req.destroy();
                httpGet(res.headers.location, timeoutMs).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) { req.destroy(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// ── Tải ảnh từ Bing Images ─────────────────────────────
async function tryBing(query, outPath) {
    try {
        const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=5`;
        const buf = await httpGet(searchUrl, 20000);
        const html = buf.toString('utf-8');

        // Bing: src="https://th.bing.com/th/id/OIP.xxxxx.jpeg?..."
        const matches = html.match(/src="(https?:\/\/th?\.?bing\.com\/th\/id\/[A-Za-z0-9_.-]+[^"]*\.(?:jpg|jpeg|png|webp))"/gi) || [];

        for (const m of matches.slice(0, 5)) {
            const url = m.match(/src="(.+)"/i)?.[1];
            if (!url) continue;
            const result = await downloadFile(url, outPath);
            if (result) return result;
        }

        // Fallback: tìm trong data-best-src
        const bestMatches = html.match(/"murl":"(https?:\/\/[^"]+\.(?:jpg|jpeg|png))"/gi) || [];
        for (const m of bestMatches.slice(0, 3)) {
            const url = m.match(/"murl":"(.+)"/i)?.[1];
            if (!url) continue;
            const result = await downloadFile(url, outPath);
            if (result) return result;
        }
    } catch (e) {
        console.log(`    [Bing] Error: ${e.message}`);
    }
    return null;
}

// ── Tải ảnh từ Amazon ──────────────────────────────────
async function tryAmazon(query, outPath) {
    try {
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query.replace(/\s+/g, '+'))}&i=industrial&rh=n%3A2418423011&s=review-rank`;
        const buf = await httpGet(searchUrl, 20000);
        const html = buf.toString('utf-8');

        // Amazon m.media CDN: "https://m.media-amazon.com/images/I/71xxxxxx._AC_SX679_.jpg"
        const matches = html.match(/"src":"(https?:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.(?:jpg|jpeg))"/gi) || [];
        for (const m of matches.slice(0, 5)) {
            let url = m.match(/"src":"(.+)"/i)?.[1];
            if (!url) continue;
            url = url.replace(/\\u0026/g, '&').replace(/\\u003d/g, '=');
            const result = await downloadFile(url, outPath);
            if (result) return result;
        }

        // Hiện Amazon direct image
        const directMatches = html.match(/(https?:\/\/images-na\.ssl-images-amazon\.com\/images\/[^"'\s]+\.(?:jpg|jpeg))/gi) || [];
        for (const url of directMatches.slice(0, 3)) {
            const result = await downloadFile(url, outPath);
            if (result) return result;
        }
    } catch (e) {
        console.log(`    [Amazon] Error: ${e.message}`);
    }
    return null;
}

// ── Tải ảnh từ trang brand chính hãng ────────────────
// Các brand có product pages với ảnh direct
async function tryBrand(product, outPath) {
    const { brand, name, flavor } = product;
    const query = `${brand} ${name} ${flavor}`;

    // Brand product page URLs patterns
    const brandUrls = buildBrandUrls(brand, name, flavor);
    for (const url of brandUrls) {
        try {
            const buf = await httpGet(url, 15000);
            const html = buf.toString('utf-8');
            const imgMatches = html.match(/(https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s]*)?)/gi) || [];
            for (const imgUrl of imgMatches.slice(0, 8)) {
                if (imgUrl.includes('logo') || imgUrl.includes('icon') || imgUrl.includes('banner')) continue;
                if (imgUrl.length > 200) continue;
                const result = await downloadFile(imgUrl, outPath);
                if (result) return result;
            }
        } catch (e) { /* next */ }
    }
    return null;
}

function buildBrandUrls(brand, name, flavor) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
    const urls = [];

    if (brand.includes('Optimum Nutrition') || brand === 'Optimum Nutrition') {
        urls.push(`https://www.optimumnutrition.com/en-us/shop/gold-standard-100-whey`);
        urls.push(`https://cdn.optimumnutrition.com/is/image/OptimNutrition/${slug}.jpg`);
    }
    if (brand.includes('Myprotein') || brand === 'Myprotein') {
        urls.push(`https://www.myprotein.com/sports-nutrition/impact-whey-protein/${slug}.info`);
    }
    if (brand.includes('MuscleTech') || brand === 'MuscleTech') {
        urls.push(`https://www.muscletech.com/en-us/products/whey-protein`);
    }
    if (brand.includes('Dymatize') || brand === 'Dymatize') {
        urls.push(`https://www.dymatize.com/products/whey-protein`);
    }
    if (brand.includes('Cellucor') || brand === 'Cellucor') {
        urls.push(`https://www.cellucor.com/collections/whey-protein`);
    }
    if (brand.includes('Quest') || brand === 'Quest Nutrition') {
        urls.push(`https://questnutrition.com/products/protein-bar/`);
    }
    if (brand.includes('ONE') || brand === 'ONE') {
        urls.push(`https://www.onebrands.com/products/protein-bar/`);
    }
    if (brand.includes('Barebells') || brand === 'Barebells') {
        urls.push(`https://www.barebells.com/us/collections/all/products/`);
    }
    if (brand.includes('Lenny') || brand.includes("Larry")) {
        urls.push(`https://www.lennylarry.com/products/complete-cookie/`);
    }

    return urls;
}

// ── Tải ảnh từ Clearbit logo ───────────────────────────
async function tryClearbit(brand, outPath) {
    try {
        const domain = brand.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
        const logoUrl = `https://logo.clearbit.com/${domain}`;
        const buf = await httpGet(logoUrl, 10000);
        if (buf.length > 200) {
            const finalPath = outPath.replace(/\.\w+$/, '.png');
            fs.writeFileSync(finalPath, buf);
            return { path: finalPath, size: buf.length };
        }
    } catch (e) { /* fail */ }
    return null;
}

// ── Download file từ URL ──────────────────────────────────
async function downloadFile(url, outPath) {
    try {
        const buf = await httpGet(url, 15000);
        if (buf.length < 500) return null;
        const ext = url.includes('.png') ? '.png' : url.includes('.webp') ? '.webp' : '.jpg';
        const finalPath = outPath.replace(/\.\w+$/, ext);
        fs.writeFileSync(finalPath, buf);
        return { path: finalPath, size: buf.length };
    } catch (e) { return null; }
}

// ── Tên file an toàn ─────────────────────────────────────
function safeName(str) {
    return (str || '').replace(/[\\/:*?"<>|']/g, '_').replace(/\s+/g, '_').substring(0, 150);
}

// ── Tải 1 sản phẩm ─────────────────────────────────────
async function downloadProduct(product, index, total) {
    const { id, name, brand, category, flavor } = product;
    const catDir = path.join(OUT_BASE, category);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

    const fileName = `${String(id).padStart(3,'0')}_${safeName(brand)}_${safeName(name.replace(/ - .*$/,''))}_${safeName(flavor)}.jpg`;
    const outPath  = path.join(catDir, fileName);

    if (fs.existsSync(outPath)) {
        const s = fs.statSync(outPath);
        if (s.size > 100) return { status: 'exists', id, name };
        fs.unlinkSync(outPath);
    }

    const query = `${brand} ${name} ${flavor}`;
    console.log(`  [${index}/${total}] 🔍 ${name.substring(0, 55)}...`);

    let result;

    // Strategy 1: Bing Images
    result = await tryBing(query, outPath);
    if (result) {
        console.log(`  [${index}/${total}] ✅ BING: ${path.basename(result.path)} (${Math.round(result.size/1024)}KB)`);
        return { status: 'saved', ...result };
    }

    // Strategy 2: Amazon
    result = await tryAmazon(query, outPath);
    if (result) {
        console.log(`  [${index}/${total}] ✅ AMAZON: ${path.basename(result.path)} (${Math.round(result.size/1024)}KB)`);
        return { status: 'saved', ...result };
    }

    // Strategy 3: Brand sites
    result = await tryBrand(product, outPath);
    if (result) {
        console.log(`  [${index}/${total}] ✅ BRAND: ${path.basename(result.path)} (${Math.round(result.size/1024)}KB)`);
        return { status: 'saved', ...result };
    }

    // Strategy 4: Clearbit logo
    result = await tryClearbit(brand, outPath);
    if (result) {
        console.log(`  [${index}/${total}] ✅ LOGO: ${path.basename(result.path)} (${Math.round(result.size/1024)}KB)`);
        return { status: 'saved', ...result };
    }

    console.log(`  [${index}/${total}] ❌ FAIL: ${name}`);
    return { status: 'failed', id, name };
}

// ── Progress bar ──────────────────────────────────────────
function progress(i, total, s, f, k) {
    const p = Math.round((i+1)/total*28);
    process.stdout.write(`\r  ${'='.repeat(p)}>${' '.repeat(28-p)} ${i+1}/${total}  saved:${s}  skip:${k}  fail:${f}   `);
}

// ── Main ─────────────────────────────────────────────────
async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  SUPPLEMENT IMAGE SCRAPER v3 (Bing+Amazon)      ║');
    console.log('╚═══════════════════════════════════════════════════════╝');

    const products = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    const total    = Math.min(TOTAL_RUN, products.length);

    console.log(`\n📦 Products: ${products.length} (running: ${total})`);
    console.log(`📁 Output : ${OUT_BASE}\n`);

    // Folders
    const cats = [...new Set(products.map(p => p.category))];
    for (const c of cats) { const d = path.join(OUT_BASE, c); if (!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
    console.log(cats.map(c => `  📂 ${c}/`).join('\n'));
    console.log(`\n⏳ Starting (${DELAY_MS/1000}s delay)...\n`);

    let saved=0, failed=0, skipped=0;
    const start = Date.now();

    for (let i=0; i<total; i++) {
        const r = await downloadProduct(products[i], i+1, total);
        if (r.status==='saved') saved++;
        else if (r.status==='failed') failed++;
        else skipped++;
        progress(i, total, saved, failed, skipped);
        if (i < total-1) await new Promise(r => setTimeout(r, DELAY_MS));
    }

    const elapsed = ((Date.now()-start)/1000).toFixed(0);
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log(`║  ✅ Đã tải : ${saved}                                     ║`);
    console.log(`║  ⏭️  Tồn tại: ${skipped}                                     ║`);
    console.log(`║  ❌ Thất bại: ${failed}                                      ║`);
    console.log(`║  ⏱️  Thời gian: ${elapsed}s                                   ║`);
    console.log('╚═══════════════════════════════════════════════════════╝');

    // Stats
    console.log('\n📊 By folder:');
    for (const c of cats) {
        const files = fs.readdirSync(path.join(OUT_BASE,c)).filter(f=>!f.startsWith('.'));
        console.log(`  ${c.padEnd(15)} → ${files.length} file(s)`);
    }
}

main().catch(console.error);
