package com.doan.ProFit.repository;

import com.doan.ProFit.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    @Query(value = """
            SELECT pi.image_url
            FROM product_images pi
            WHERE pi.product_id = :productId
            ORDER BY
                CASE WHEN pi.is_primary = 1 THEN 0 ELSE 1 END,
                COALESCE(pi.sort_order, 2147483647),
                COALESCE(pi.primary_product_guard, 2147483647),
                pi.id
            LIMIT 1
            """, nativeQuery = true)
    Optional<String> findBestImageUrlByProductId(@Param("productId") Long productId);
}
