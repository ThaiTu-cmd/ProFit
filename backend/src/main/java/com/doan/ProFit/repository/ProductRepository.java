package com.doan.ProFit.repository;

import com.doan.ProFit.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByIsActiveTrueAndDeletedAtIsNull();
    Page<Product> findByIsActiveTrueAndDeletedAtIsNull(Pageable pageable);
    Page<Product> findByCategoryIdAndIsActiveTrueAndDeletedAtIsNull(Long categoryId, Pageable pageable);
    Page<Product> findByNameContainingIgnoreCaseAndIsActiveTrueAndDeletedAtIsNull(String name, Pageable pageable);
    Optional<Product> findByIdAndIsActiveTrueAndDeletedAtIsNull(Long id);
    Optional<Product> findBySku(String sku);
    Optional<Product> findBySlug(String slug);
}
