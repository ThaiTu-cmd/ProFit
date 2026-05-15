SET NAMES utf8mb4;
-- Fix: Cho phép user_id NULL để guest checkout hoạt động
ALTER TABLE orders MODIFY COLUMN user_id BIGINT NULL;
DELETE FROM ProFitSuppsDB.products;
DELETE FROM ProFitSuppsDB.categories;
INSERT INTO ProFitSuppsDB.categories (id, name, slug, is_active, created_at, updated_at) VALUES (1, 'Whey Protein', 'whey-protein', 1, NOW(), NOW());
INSERT INTO ProFitSuppsDB.categories (id, name, slug, is_active, created_at, updated_at) VALUES (2, 'Pre-Workout', 'pre-workout', 1, NOW(), NOW());
INSERT INTO ProFitSuppsDB.categories (id, name, slug, is_active, created_at, updated_at) VALUES (3, 'Vitamin & Khoáng Chất', 'vitamin', 1, NOW(), NOW());
INSERT INTO ProFitSuppsDB.products (id, category_id, name, slug, sku, short_description, description, price, old_price, stock_quantity, rating_avg, rating_count, is_active, created_at, updated_at) VALUES (1, 1, 'Whey Gold Standard 5lbs', 'whey-gold-standard', 'WHEY-GS-01', 'Sữa tăng cơ số 1 thế giới', 'Chi tiết sữa tăng cơ Whey Gold...', 1500000, 1800000, 50, 0, 0, 1, NOW(), NOW());
INSERT INTO ProFitSuppsDB.products (id, category_id, name, slug, sku, short_description, description, price, old_price, stock_quantity, rating_avg, rating_count, is_active, created_at, updated_at) VALUES (2, 1, 'ISO 100 Dymatize 5lbs', 'iso-100', 'ISO-100-01', 'Whey thủy phân hấp thu nhanh', 'Chi tiết ISO 100...', 1950000, 2200000, 30, 0, 0, 1, NOW(), NOW());
INSERT INTO ProFitSuppsDB.products (id, category_id, name, slug, sku, short_description, description, price, old_price, stock_quantity, rating_avg, rating_count, is_active, created_at, updated_at) VALUES (3, 2, 'C4 Original 60 Servings', 'c4-original', 'C4-ORG-01', 'Tăng sức mạnh tập luyện', 'Chi tiết C4...', 750000, 850000, 100, 0, 0, 1, NOW(), NOW());
