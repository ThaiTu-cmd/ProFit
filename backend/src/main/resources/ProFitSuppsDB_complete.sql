-- =====================================================
-- ProFitSuppsDB - COMPLETE SCHEMA + SEED DATA
-- File này dùng để IMPORT TRỰC TIẾP vào MySQL
-- (Backup hoặc setup mới hoàn toàn)
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS `ProFitSuppsDB`;
CREATE DATABASE `ProFitSuppsDB` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ProFitSuppsDB`;

-- =====================================================
-- PHẦN 1: SCHEMA
-- =====================================================

-- BẢNG users
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(10) NOT NULL DEFAULT 'CUSTOMER',
    `status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    `email_verified_at` DATETIME NULL,
    `deleted_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_email` (`email`),
    KEY `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG user_addresses
CREATE TABLE `user_addresses` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `address_line1` VARCHAR(255) NOT NULL,
    `address_line2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `country` VARCHAR(100) NOT NULL DEFAULT 'Vietnam',
    `postal_code` VARCHAR(20) NULL,
    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_addresses_user` (`user_id`, `type`, `deleted_at`),
    CONSTRAINT `fk_addr_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG payment_methods
CREATE TABLE `payment_methods` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `payment_type` VARCHAR(30) NOT NULL,
    `provider` VARCHAR(50) NULL,
    `account_name` VARCHAR(100) NULL,
    `last_4_digits` VARCHAR(4) NULL,
    `token_ref` VARCHAR(255) NULL,
    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    KEY `idx_payment_methods_user` (`user_id`, `payment_type`, `deleted_at`),
    CONSTRAINT `fk_pm_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG categories
CREATE TABLE `categories` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `deleted_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_categories_slug` (`slug`),
    KEY `idx_categories_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG products
CREATE TABLE `products` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `slug` VARCHAR(150) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `short_description` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `price` DECIMAL(15,2) NOT NULL,
    `old_price` DECIMAL(15,2) NULL,
    `rating_avg` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    `rating_count` INT NOT NULL DEFAULT 0,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `deleted_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_products_sku` (`sku`),
    UNIQUE KEY `uk_products_slug` (`slug`),
    KEY `idx_products_category_active` (`category_id`, `is_active`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG product_images
CREATE TABLE `product_images` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `sort_order` INT DEFAULT 0,
    `is_primary` TINYINT(1) DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_product_images_product` (`product_id`, `sort_order`),
    CONSTRAINT `fk_image_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG product_tags
CREATE TABLE `product_tags` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_product_tags_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG product_tag_map (KHÔNG CÓ entity JPA - chỉ dùng native query)
CREATE TABLE `product_tag_map` (
    `product_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,
    PRIMARY KEY (`product_id`, `tag_id`),
    KEY `idx_product_tag_map_tag` (`tag_id`),
    CONSTRAINT `fk_map_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_map_tag` FOREIGN KEY (`tag_id`) REFERENCES `product_tags`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG discount_codes
CREATE TABLE `discount_codes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `discount_type` VARCHAR(20) NOT NULL,
    `discount_value` DECIMAL(15,2) NOT NULL,
    `min_order_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `max_discount_amount` DECIMAL(15,2) NULL,
    `per_user_limit` INT NULL,
    `global_limit` INT NULL,
    `used_count` INT NOT NULL DEFAULT 0,
    `start_at` DATETIME NULL,
    `end_at` DATETIME NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_discount_codes_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG shipping_methods
CREATE TABLE `shipping_methods` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `fee` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_shipping_methods_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG orders
CREATE TABLE `orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `order_code` VARCHAR(50) NOT NULL,
    `shipping_address_id` BIGINT NULL,
    `payment_method_id` BIGINT NULL,
    `shipping_method_id` BIGINT NULL,
    `discount_code_id` BIGINT NULL,
    `recipient_name` VARCHAR(100) NOT NULL,
    `recipient_phone` VARCHAR(20) NOT NULL,
    `shipping_address_line1` VARCHAR(255) NOT NULL,
    `shipping_address_line2` VARCHAR(255) NULL,
    `shipping_city` VARCHAR(100) NOT NULL,
    `shipping_province` VARCHAR(100) NOT NULL,
    `shipping_country` VARCHAR(100) NOT NULL DEFAULT 'Vietnam',
    `shipping_postal_code` VARCHAR(20) NULL,
    `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `shipping_fee` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `payment_status` VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    `note` VARCHAR(500) NULL,
    `placed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `paid_at` DATETIME NULL,
    `canceled_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_orders_order_code` (`order_code`),
    KEY `idx_orders_user_status_created` (`user_id`, `status`, `created_at`),
    KEY `idx_orders_discount_code` (`discount_code_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG order_items
CREATE TABLE `order_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `product_id` BIGINT NOT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `product_sku` VARCHAR(50) NOT NULL,
    `quantity` INT NOT NULL,
    `unit_price` DECIMAL(15,2) NOT NULL,
    `line_total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`id`),
    KEY `idx_order_items_product` (`product_id`),
    CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_oi_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG discount_usages
CREATE TABLE `discount_usages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `discount_code_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `order_id` BIGINT NOT NULL,
    `used_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_discount_usages_order_once` (`order_id`),
    KEY `idx_discount_usages_code_user` (`discount_code_id`, `user_id`),
    CONSTRAINT `fk_du_code` FOREIGN KEY (`discount_code_id`) REFERENCES `discount_codes`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_du_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_du_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG order_status_history
CREATE TABLE `order_status_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `old_status` VARCHAR(20) NULL,
    `new_status` VARCHAR(20) NOT NULL,
    `changed_note` VARCHAR(255) NULL,
    `changed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_order_status_history_order` (`order_id`, `changed_at`),
    CONSTRAINT `fk_osh_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG payments
CREATE TABLE `payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `provider` VARCHAR(50) NULL,
    `payment_method` VARCHAR(50) NOT NULL,
    `transaction_code` VARCHAR(100) NULL,
    `amount` DECIMAL(15,2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'VND',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `paid_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_payments_order_status` (`order_id`, `status`),
    CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG stock_movements
CREATE TABLE `stock_movements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT NOT NULL,
    `quantity` INT NOT NULL,
    `reason` VARCHAR(20) NOT NULL,
    `reference_type` VARCHAR(20) NULL,
    `reference_id` BIGINT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_stock_movements_product_created` (`product_id`, `created_at`),
    CONSTRAINT `fk_sm_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BẢNG reviews
CREATE TABLE `reviews` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `rating` INT NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_reviews_product` (`product_id`, `created_at`),
    CONSTRAINT `fk_review_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_review_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- PHẦN 2: SEED DATA
-- =====================================================

-- 1. Categories (6 danh mục)
INSERT INTO `categories` (`id`, `name`, `slug`, `is_active`) VALUES
(1, 'Whey Protein', 'whey-protein', 1),
(2, 'Pre-Workout', 'pre-workout', 1),
(3, 'Vitamin & Khoáng Chất', 'vitamin-khoang-chat', 1),
(4, 'Meal Replacement', 'meal-replacement', 1),
(5, 'Protein Bars & Cookies', 'protein-bars-cookies', 1),
(6, 'Khác', 'khac', 1);

-- 2. Product Tags
INSERT INTO `product_tags` (`id`, `code`, `display_name`) VALUES
(1, 'best-seller', 'Best Seller'),
(2, 'new-arrival', 'New Arrival'),
(3, 'on-sale', 'On Sale'),
(4, 'hot-deal', 'Hot Deal'),
(5, 'popular', 'Popular');

-- 3. Products (9 sản phẩm)
INSERT INTO `products` (`id`, `category_id`, `sku`, `slug`, `name`, `short_description`, `description`, `price`, `old_price`, `rating_avg`, `rating_count`, `stock_quantity`, `is_active`) VALUES
-- Product 1: Meal Replacement - Labrada Lean Body gói lẻ
(1, 4, 'WS-BCE1DC0F1785', 'labrada-lean-body-protein-shake-goi-le', 'Labrada Lean Body Protein Shake gói lẻ',
 '1 gói Lean Body 79g cung cấp: 325 calories, 21g carbohydrate, 40g protein. Bữa phụ hoàn hảo, hỗ trợ tăng cơ.',
 'Mô tả chi tiết Labrada Lean Body gói lẻ - Meal replacement chất lượng cao từ Labrada Nutrition. Mỗi gói 79g cung cấp 40g protein, 325 calories, thích hợp cho bữa phụ hoặc thay bữa ăn nhẹ.',
 85000.00, 95000.00, 4.50, 12, 500, 1),

-- Product 2: Meal Replacement - Labrada Lean Body 80 gói
(2, 4, 'WS-147B6C87E6C9', 'labrada-lean-body-protein-shake-80-goi', 'Labrada Lean Body Protein Shake 80 gói',
 'Hộp Lean Body 80 gói - Bữa ăn thay thế tiện lợi, bổ sung 40G Protein chất lượng cao.',
 'Hộp 80 gói Labrada Lean Body Protein Shake - Meal replacement tiện lợi, mỗi gói chứa 40g protein, 325 calories, có thể dùng làm bữa ăn thay thế hoặc bữa phụ giàu protein.',
 6490000.00, 7600000.00, 4.70, 25, 50, 1),

-- Product 3: Protein Bars & Cookies - Applied Nutrition Critical Cookie lẻ
(3, 5, 'WS-154B79C28932', 'applied-nutrition-critical-cookie', 'Applied Nutrition Critical Cookie',
 'Mỗi chiếc bánh cung cấp 20g Protein, ~390kcal. Bánh protein tiện lợi.',
 'Applied Nutrition Critical Cookie - Bánh protein cookies giòn ngon, mỗi chiếc chứa 20g protein, khoảng 390 calories. Thích hợp làm bữa phụ trước/sau tập gym.',
 70000.00, 80000.00, 4.30, 18, 300, 1),

-- Product 4: Protein Bars & Cookies - Applied Nutrition Critical Cookie 12 bánh
(4, 5, 'WS-8ADDCF519296', 'applied-nutrition-critical-cookie-12-banh', 'Applied Nutrition Critical Cookie 12 bánh',
 'Hộp 12 bánh Critical Cookie - Bánh protein tiện lợi cho bữa phụ.',
 'Hộp 12 bánh Applied Nutrition Critical Cookie - Bánh protein cookies vị ngon, mỗi chiếc chứa 20g protein, tiện lợi cho việc mang theo làm bữa phụ hàng ngày.',
 740000.00, 840000.00, 4.60, 30, 100, 1),

-- Product 5: Whey Protein - ON Platinum Hydro Whey 3.5lbs
(5, 1, 'WS-6C7343DF89CF', 'on-platinum-hydro-whey-3-5lbs', 'ON Platinum Hydro Whey 3.5lbs',
 '30g Protein Hydrolyzed Whey Protein Isolate siêu tinh khiết. Hấp thụ cực nhanh.',
 'Optimum Nutrition Platinum Hydro Whey - Whey protein thủy phân cao cấp, 30g protein mỗi serving, hấp thụ cực nhanh nhờ quá trình thủy phân. Khối lượng 3.5lbs (~1.6kg), khoảng 52 servings.',
 2150000.00, 2500000.00, 4.80, 45, 80, 1),

-- Product 6: Whey Protein - VX Iso Pro Hydrolyzed Whey Isolate 2lbs
(6, 1, 'WS-5B55181ABC5D', 'vx-iso-pro-hydrolyzed-whey-isolate-2lbs', 'VX Iso Pro Hydrolyzed Whey Isolate 2lbs',
 '27g Protein Hydrolyzed Whey Isolate. Hấp thụ nhanh, ít calo.',
 'VX Iso Pro Hydrolyzed Whey Isolate - Whey protein thủy phân, 27g protein per serving, hấp thụ nhanh, hàm lượng carb và fat thấp. Khối lượng 2lbs (~900g).',
 890000.00, 1050000.00, 4.40, 20, 120, 1),

-- Product 7: Meal Replacement - Labrada Lean Body 4.63lbs
(7, 4, 'WS-201A5ADA8A8F', 'labrada-lean-body-protein-shake-4-63lbs', 'Labrada Lean Body Protein Shake 4.63lbs',
 '35g Protein, 19g Carb, 8g Fat. Bữa ăn thay thế đầy đủ dinh dưỡng.',
 'Labrada Lean Body Protein Shake 4.63lbs (~2.1kg) - Meal replacement đầy đủ dinh dưỡng, mỗi serving cung cấp 35g protein, 19g carb, 8g fat. Thích hợp cho người tập gym muốn tăng cơ hoặc giảm mỡ.',
 1750000.00, 1950000.00, 4.65, 35, 60, 1),

-- Product 8: Protein Bars & Cookies - Applied Nutrition Protein Crunch Bar
(8, 5, 'WS-EB00F0AC4A09', 'applied-nutrition-protein-crunch-bar', 'Applied Nutrition Protein Crunch Bar 62g',
 '20g protein, 214 kcal. Thanh protein low carb tiện lợi.',
 'Applied Nutrition Protein Crunch Bar 62g - Thanh protein crunch thơm ngon, chứa 20g protein, chỉ 214 calories, low carb. Vị chocolate chip crunch yêu thích.',
 60000.00, 70000.00, 4.20, 15, 400, 1),

-- Product 9: Whey Protein - BiotechUSA Iso Whey Zero 1 serving
(9, 1, 'WS-98CEFE738629', 'biotechusa-iso-whey-zero-sample', 'Sample BiotechUSA Iso Whey Zero 1 serving',
 '21g Protein từ Whey Isolate. Gói sample tiện lợi.',
 'BiotechUSA Iso Whey Zero - Gói sample 1 serving, cung cấp 21g protein từ Whey Protein Isolate thuần khiết, không đường, không aspartame. Thích hợp dùng thử trước khi mua hộp lớn.',
 30000.00, NULL, 4.10, 8, 1000, 1);

-- 4. Product Images (9 images - 1 per product)
INSERT INTO `product_images` (`product_id`, `image_url`, `sort_order`, `is_primary`) VALUES
(1, 'https://www.wheystore.vn/images/products/2024/01/23/small/lean-body-79g_1705983462.jpg', 1, 1),
(2, 'https://www.wheystore.vn/images/products/2024/01/23/small/combo-80-goi-lean-body_1705983855.jpg', 1, 1),
(3, 'https://www.wheystore.vn/images/products/2024/02/05/small/1-banh-critical-cookie_1707123160.jpg', 1, 1),
(4, 'https://www.wheystore.vn/images/products/2024/02/05/small/12-banh-critical-cookie_1707123280.jpg', 1, 1),
(5, 'https://www.wheystore.vn/images/products/2023/11/23/small/platinum-hydro-whey-3-5lbs_1700708519.jpg', 1, 1),
(6, 'https://www.wheystore.vn/images/products/2023/12/16/small/iso-pro-2lbs_1703152910.jpg', 1, 1),
(7, 'https://www.wheystore.vn/images/products/2024/01/23/small/lean-body-protein-shake-4-63lbs_1705985676.jpg', 1, 1),
(8, 'https://www.wheystore.vn/images/products/2024/01/31/resized/applied-nutrition-protein-crunch-60g_1706672725.jpg', 1, 1),
(9, 'https://www.wheystore.vn/images/products/2024/03/05/resized/sample-rule-1-1-serving_1709604941.jpg', 1, 1);

-- 5. Product Tag Map (tag mapping đúng cho 9 sản phẩm)
-- Tags: 1=best-seller, 2=new-arrival, 3=on-sale, 4=hot-deal, 5=popular
INSERT INTO `product_tag_map` (`product_id`, `tag_id`) VALUES
(1, 1), (1, 3),  -- Lean Body gói - best-seller + on-sale
(2, 1), (2, 3),  -- Lean Body 80 gói - best-seller + on-sale
(3, 3),           -- Critical Cookie lẻ - on-sale
(4, 1),           -- Critical Cookie 12 bánh - best-seller
(5, 1),           -- ON Platinum Hydro Whey - best-seller
(6, 5),           -- VX Iso Pro - popular
(7, 3),           -- Lean Body 4.63lbs - on-sale
(8, 3),           -- Protein Crunch Bar - on-sale
(9, 2);           -- BiotechUSA sample - new-arrival

-- =====================================================
-- XONG - Database đã sẵn sàng!
-- =====================================================
