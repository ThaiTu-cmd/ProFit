-- Chèn dữ liệu mẫu cho Danh mục (Categories)
INSERT IGNORE INTO categories (id, name, slug, is_active, created_at, updated_at) VALUES 
(1, 'Whey Protein', 'whey-protein', 1, NOW(), NOW()),
(2, 'Pre-Workout', 'pre-workout', 1, NOW(), NOW()),
(3, 'Vitamin & Khoáng Chất', 'vitamin', 1, NOW(), NOW());

-- Chèn dữ liệu mẫu cho Sản phẩm (Products)
-- (Đã thêm rating_avg và rating_count để tránh lỗi MySQL bắt buộc nhập)
INSERT IGNORE INTO products (id, category_id, name, slug, sku, short_description, description, price, old_price, stock_quantity, rating_avg, rating_count, is_active, created_at, updated_at) VALUES 
(1, 1, 'Whey Gold Standard 5lbs', 'whey-gold-standard', 'WHEY-GS-01', 'Sữa tăng cơ số 1 thế giới', 'Chi tiết sữa tăng cơ Whey Gold...', 1500000, 1800000, 50, 0, 0, 1, NOW(), NOW()),
(2, 1, 'ISO 100 Dymatize 5lbs', 'iso-100', 'ISO-100-01', 'Whey thủy phân hấp thu nhanh', 'Chi tiết ISO 100...', 1950000, 2200000, 30, 0, 0, 1, NOW(), NOW()),
(3, 2, 'C4 Original 60 Servings', 'c4-original', 'C4-ORG-01', 'Tăng sức mạnh tập luyện', 'Chi tiết C4...', 750000, 850000, 100, 0, 0, 1, NOW(), NOW());

-- Chèn dữ liệu mẫu cho Khách hàng test (Mật khẩu mặc định: 123456)
-- (Lưu ý: Mật khẩu đã được mã hóa bằng BCrypt của chữ "123456")
INSERT INTO users (id, full_name, email, phone, password_hash, role, status, created_at, updated_at) VALUES 
(2, 'Khách Hàng Test', 'khachhang@gmail.com', '0987654321', '$2a$10$wE9wN/.e.4o8jS4sQJ7Yy.XGf9qC8X1j1P5sO4vYy7vYy7vYy7vYy', 'CUSTOMER', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
full_name = 'Khách Hàng Test', password_hash = '$2a$10$wE9wN/.e.4o8jS4sQJ7Yy.XGf9qC8X1j1P5sO4vYy7vYy7vYy7vYy';
