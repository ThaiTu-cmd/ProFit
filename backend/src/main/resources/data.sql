-- =====================================================
-- data.sql - Dữ liệu mẫu cho ProFitSuppsDB
-- Chạy tự động khi Spring Boot khởi động (application.yaml: spring.sql.init.mode=always)
-- =====================================================

-- =====================================================
-- BƯỚC 1: Categories (6 danh mục)
-- =====================================================
INSERT IGNORE INTO categories (id, name, slug, is_active, created_at, updated_at) VALUES
(1, 'Whey Protein', 'whey-protein', 1, NOW(), NOW()),
(2, 'Pre-Workout', 'pre-workout', 1, NOW(), NOW()),
(3, 'Vitamin & Khoáng Chất', 'vitamin-khoang-chat', 1, NOW(), NOW()),
(4, 'Meal Replacement', 'meal-replacement', 1, NOW(), NOW()),
(5, 'Protein Bars & Cookies', 'protein-bars-cookies', 1, NOW(), NOW()),
(6, 'Khác', 'khac', 1, NOW(), NOW());

-- =====================================================
-- BƯỚC 2: Product Tags
-- =====================================================
INSERT IGNORE INTO product_tags (id, code, display_name) VALUES
(1, 'best-seller', 'Best Seller'),
(2, 'new-arrival', 'New Arrival'),
(3, 'on-sale', 'On Sale'),
(4, 'hot-deal', 'Hot Deal'),
(5, 'popular', 'Popular');

-- =====================================================
-- BƯỚC 3: Products (9 sản phẩm)
-- NOTE: category_id phải reference categories.id (1-6)
-- NOTE: price phải > 0 để hiển thị đúng
-- NOTE: stock_quantity > 0 để hiển thị "Còn hàng"
-- =====================================================
INSERT INTO products (id, category_id, sku, slug, name, short_description, description, price, old_price, rating_avg, rating_count, stock_quantity, is_active, deleted_at, created_at, updated_at) VALUES
-- Product 1: Meal Replacement - Labrada Lean Body gói lẻ
(1, 4, 'WS-BCE1DC0F1785', 'labrada-lean-body-protein-shake-goi-le', 'Labrada Lean Body Protein Shake gói lẻ',
 '1 gói Lean Body 79g cung cấp: 325 calories, 21g carbohydrate, 40g protein. Bữa phụ hoàn hảo, hỗ trợ tăng cơ.',
 'Mô tả chi tiết Labrada Lean Body gói lẻ - Meal replacement chất lượng cao từ Labrada Nutrition. Mỗi gói 79g cung cấp 40g protein, 325 calories, thích hợp cho bữa phụ hoặc thay bữa ăn nhẹ.',
 85000.00, 95000.00, 4.50, 12, 500, 1, NULL, NOW(), NOW()),

-- Product 2: Meal Replacement - Labrada Lean Body 80 gói
(2, 4, 'WS-147B6C87E6C9', 'labrada-lean-body-protein-shake-80-goi', 'Labrada Lean Body Protein Shake 80 gói',
 'Hộp Lean Body 80 gói - Bữa ăn thay thế tiện lợi, bổ sung 40G Protein chất lượng cao.',
 'Hộp 80 gói Labrada Lean Body Protein Shake - Meal replacement tiện lợi, mỗi gói chứa 40g protein, 325 calories, có thể dùng làm bữa ăn thay thế hoặc bữa phụ giàu protein.',
 6490000.00, 7600000.00, 4.70, 25, 50, 1, NULL, NOW(), NOW()),

-- Product 3: Protein Bars & Cookies - Applied Nutrition Critical Cookie lẻ
(3, 5, 'WS-154B79C28932', 'applied-nutrition-critical-cookie', 'Applied Nutrition Critical Cookie',
 'Mỗi chiếc bánh cung cấp 20g Protein, ~390kcal. Bánh protein tiện lợi.',
 'Applied Nutrition Critical Cookie - Bánh protein cookies giòn ngon, mỗi chiếc chứa 20g protein, khoảng 390 calories. Thích hợp làm bữa phụ trước/sau tập gym.',
 70000.00, 80000.00, 4.30, 18, 300, 1, NULL, NOW(), NOW()),

-- Product 4: Protein Bars & Cookies - Applied Nutrition Critical Cookie 12 bánh
(4, 5, 'WS-8ADDCF519296', 'applied-nutrition-critical-cookie-12-banh', 'Applied Nutrition Critical Cookie 12 bánh',
 'Hộp 12 bánh Critical Cookie - Bánh protein tiện lợi cho bữa phụ.',
 'Hộp 12 bánh Applied Nutrition Critical Cookie - Bánh protein cookies vị ngon, mỗi chiếc chứa 20g protein, tiện lợi cho việc mang theo làm bữa phụ hàng ngày.',
 740000.00, 840000.00, 4.60, 30, 100, 1, NULL, NOW(), NOW()),

-- Product 5: Whey Protein - ON Platinum Hydro Whey 3.5lbs
(5, 1, 'WS-6C7343DF89CF', 'on-platinum-hydro-whey-3-5lbs', 'ON Platinum Hydro Whey 3.5lbs',
 '30g Protein Hydrolyzed Whey Protein Isolate siêu tinh khiết. Hấp thụ cực nhanh.',
 'Optimum Nutrition Platinum Hydro Whey - Whey protein thủy phân cao cấp, 30g protein mỗi serving, hấp thụ cực nhanh nhờ quá trình thủy phân. Khối lượng 3.5lbs (~1.6kg), khoảng 52 servings.',
 2150000.00, 2500000.00, 4.80, 45, 80, 1, NULL, NOW(), NOW()),

-- Product 6: Whey Protein - VX Iso Pro Hydrolyzed Whey Isolate 2lbs
(6, 1, 'WS-5B55181ABC5D', 'vx-iso-pro-hydrolyzed-whey-isolate-2lbs', 'VX Iso Pro Hydrolyzed Whey Isolate 2lbs',
 '27g Protein Hydrolyzed Whey Isolate. Hấp thụ nhanh, ít calo.',
 'VX Iso Pro Hydrolyzed Whey Isolate - Whey protein thủy phân, 27g protein per serving, hấp thụ nhanh, hàm lượng carb và fat thấp. Khối lượng 2lbs (~900g).',
 890000.00, 1050000.00, 4.40, 20, 120, 1, NULL, NOW(), NOW()),

-- Product 7: Meal Replacement - Labrada Lean Body 4.63lbs
(7, 4, 'WS-201A5ADA8A8F', 'labrada-lean-body-protein-shake-4-63lbs', 'Labrada Lean Body Protein Shake 4.63lbs',
 '35g Protein, 19g Carb, 8g Fat. Bữa ăn thay thế đầy đủ dinh dưỡng.',
 'Labrada Lean Body Protein Shake 4.63lbs (~2.1kg) - Meal replacement đầy đủ dinh dưỡng, mỗi serving cung cấp 35g protein, 19g carb, 8g fat. Thích hợp cho người tập gym muốn tăng cơ hoặc giảm mỡ.',
 1750000.00, 1950000.00, 4.65, 35, 60, 1, NULL, NOW(), NOW()),

-- Product 8: Protein Bars & Cookies - Applied Nutrition Protein Crunch Bar
(8, 5, 'WS-EB00F0AC4A09', 'applied-nutrition-protein-crunch-bar', 'Applied Nutrition Protein Crunch Bar 62g',
 '20g protein, 214 kcal. Thanh protein low carb tiện lợi.',
 'Applied Nutrition Protein Crunch Bar 62g - Thanh protein crunch thơm ngon, chứa 20g protein, chỉ 214 calories, low carb. Vị chocolate chip crunch yêu thích.',
 60000.00, 70000.00, 4.20, 15, 400, 1, NULL, NOW(), NOW()),

-- Product 9: Whey Protein - Sample BiotechUSA Iso Whey Zero 1 serving
(9, 1, 'WS-98CEFE738629', 'biotechusa-iso-whey-zero-sample', 'Sample BiotechUSA Iso Whey Zero 1 serving',
 '21g Protein từ Whey Isolate. Gói sample tiện lợi.',
 'BiotechUSA Iso Whey Zero - Gói sample 1 serving, cung cấp 21g protein từ Whey Protein Isolate thuần khiết, không đường, không aspartame. Thích hợp dùng thử trước khi mua hộp lớn.',
 30000.00, NULL, 4.10, 8, 1000, 1, NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    category_id = VALUES(category_id),
    name = VALUES(name),
    short_description = VALUES(short_description),
    description = VALUES(description),
    price = VALUES(price),
    old_price = VALUES(old_price),
    rating_avg = VALUES(rating_avg),
    rating_count = VALUES(rating_count),
    stock_quantity = VALUES(stock_quantity),
    is_active = VALUES(is_active),
    updated_at = NOW();

-- =====================================================
-- BƯỚC 4: Product Images (chính xác 9 images - 1 per product)
-- NOTE: Sửa lại image URLs cho phù hợp với 9 sản phẩm trên
-- =====================================================
SET FOREIGN_KEY_CHECKS = 0;

-- Xoá images cũ của các product_id 10-49 (nếu có) để tránh FK error
DELETE FROM product_images WHERE product_id NOT BETWEEN 1 AND 9;

INSERT INTO product_images (product_id, image_url, sort_order, is_primary) VALUES
-- Product 1: Labrada Lean Body gói lẻ
(1, 'https://www.wheystore.vn/images/products/2024/01/23/small/lean-body-79g_1705983462.jpg', 1, 1),
-- Product 2: Labrada Lean Body 80 gói
(2, 'https://www.wheystore.vn/images/products/2024/01/23/small/combo-80-goi-lean-body_1705983855.jpg', 1, 1),
-- Product 3: Applied Nutrition Critical Cookie
(3, 'https://www.wheystore.vn/images/products/2024/02/05/small/1-banh-critical-cookie_1707123160.jpg', 1, 1),
-- Product 4: Applied Nutrition Critical Cookie 12 bánh
(4, 'https://www.wheystore.vn/images/products/2024/02/05/small/12-banh-critical-cookie_1707123280.jpg', 1, 1),
-- Product 5: ON Platinum Hydro Whey 3.5lbs
(5, 'https://www.wheystore.vn/images/products/2023/11/23/small/platinum-hydro-whey-3-5lbs_1700708519.jpg', 1, 1),
-- Product 6: VX Iso Pro Hydrolyzed Whey 2lbs
(6, 'https://www.wheystore.vn/images/products/2023/12/16/small/iso-pro-2lbs_1703152910.jpg', 1, 1),
-- Product 7: Labrada Lean Body 4.63lbs
(7, 'https://www.wheystore.vn/images/products/2024/01/23/small/lean-body-protein-shake-4-63lbs_1705985676.jpg', 1, 1),
-- Product 8: Applied Nutrition Protein Crunch Bar
(8, 'https://www.wheystore.vn/images/products/2024/01/31/resized/applied-nutrition-protein-crunch-60g_1706672725.jpg', 1, 1),
-- Product 9: BiotechUSA Iso Whey Zero sample
(9, 'https://www.wheystore.vn/images/products/2024/03/05/resized/sample-rule-1-1-serving_1709604941.jpg', 1, 1)
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- BƯỚC 5: Product Tag Map (tag mapping cho 9 sản phẩm)
-- Tags: 1=best-seller, 2=new-arrival, 3=on-sale, 4=hot-deal, 5=popular
-- =====================================================
DELETE FROM product_tag_map WHERE product_id NOT BETWEEN 1 AND 9;

INSERT INTO product_tag_map (product_id, tag_id) VALUES
-- Product 1: Lean Body gói - best-seller + on-sale
(1, 1), (1, 3),
-- Product 2: Lean Body 80 gói - best-seller + on-sale
(2, 1), (2, 3),
-- Product 3: Critical Cookie lẻ - on-sale
(3, 3),
-- Product 4: Critical Cookie 12 bánh - best-seller
(4, 1),
-- Product 5: ON Platinum Hydro Whey - best-seller
(5, 1),
-- Product 6: VX Iso Pro - popular
(6, 5),
-- Product 7: Lean Body 4.63lbs - on-sale
(7, 3),
-- Product 8: Protein Crunch Bar - on-sale
(8, 3),
-- Product 9: BiotechUSA sample - new-arrival
(9, 2)
ON DUPLICATE KEY UPDATE product_id = VALUES(product_id);
