-- =====================================================
-- MIGRATION V002: Add Chatbot tables + missing fields
-- Generated từ MySQL đang chạy (profit-mysql container)
-- Safe: dùng CREATE TABLE IF NOT EXISTS và kiểm tra cột
--       trước khi ADD để không lỗi khi chạy lại
-- =====================================================

USE `ProFitSuppsDB`;

-- =====================================================
-- 1. BẢNG CHATBOT (5 bảng mới)
-- =====================================================

CREATE TABLE IF NOT EXISTS `cb_chat_sessions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('guest','user','admin') COLLATE utf8mb4_unicode_ci DEFAULT 'guest',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role` (`role`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cb_chat_messages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','assistant') COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tool_calls` json DEFAULT NULL,
  `token_usage` json DEFAULT NULL,
  `latency_ms` int DEFAULT NULL,
  `retrieval_scores` json DEFAULT NULL,
  `route_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_role` (`role`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `cb_chat_messages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `cb_chat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cb_llm_observability` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latency_ms` int NOT NULL,
  `prompt_tokens` int DEFAULT NULL,
  `completion_tokens` int DEFAULT NULL,
  `total_tokens` int DEFAULT NULL,
  `llm_calls` int DEFAULT '1',
  `model` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `retrieval_scores` json DEFAULT NULL,
  `reranker_top_score` float DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `cb_llm_observability_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `cb_chat_messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cb_llm_observability_ibfk_2` FOREIGN KEY (`session_id`) REFERENCES `cb_chat_sessions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cb_chat_feedback` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` enum('like','dislike') COLLATE utf8mb4_unicode_ci NOT NULL,
  `dislike_label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dislike_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_rating` (`rating`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `cb_chat_feedback_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `cb_chat_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cb_vector_products` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pgvector_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ingested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pgvector_id` (`pgvector_id`),
  KEY `idx_category` (`category`),
  KEY `idx_brand` (`brand`),
  KEY `idx_pgvector_id` (`pgvector_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. CỘT MỚI CHO USERS (reset password feature)
-- =====================================================

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'reset_token'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `reset_token` VARCHAR(255) NULL AFTER `updated_at`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'reset_token_expiry'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `reset_token_expiry` DATETIME(6) NULL AFTER `reset_token`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. CỘT MỚI CHO REVIEWS (verified purchase + reviewer phone)
-- =====================================================

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reviews'
    AND COLUMN_NAME = 'is_verified_purchase'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `reviews` ADD COLUMN `is_verified_purchase` BIT(1) NULL AFTER `updated_at`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reviews'
    AND COLUMN_NAME = 'phone'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `reviews` ADD COLUMN `phone` VARCHAR(255) NULL AFTER `is_verified_purchase`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 4. MỞ RỘNG USERS.ROLE (thêm GUEST nếu chưa có)
-- Chỉ MODIFY nếu GUEST chưa có trong enum
-- =====================================================

SET @has_guest = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role'
    AND COLUMN_TYPE LIKE '%GUEST%'
);
SET @sql = IF(@has_guest = 0,
  'ALTER TABLE `users` MODIFY COLUMN `role` ENUM(''CUSTOMER'', ''ADMIN'', ''GUEST'') NOT NULL DEFAULT ''CUSTOMER''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 5. RELAX orders.status & orders.payment_status → VARCHAR
-- (MySQL đang chạy hiện đang là VARCHAR, giữ nguyên để
--  tránh mất data khi backend thêm status mới sau này)
-- Chỉ MODIFY nếu hiện tại đang ENUM
-- =====================================================

SET @is_enum = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'status'
    AND DATA_TYPE = 'enum'
);
SET @sql = IF(@is_enum > 0,
  'ALTER TABLE `orders` MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT ''PENDING''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @is_enum = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'payment_status'
    AND DATA_TYPE = 'enum'
);
SET @sql = IF(@is_enum > 0,
  'ALTER TABLE `orders` MODIFY COLUMN `payment_status` VARCHAR(20) NOT NULL DEFAULT ''UNPAID''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- Done! Restart backend để Hibernate revalidate schema
-- =====================================================
