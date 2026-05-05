package com.doan.ProFit.service;

import com.doan.ProFit.dto.request.ProductRequest;
import com.doan.ProFit.dto.response.ProductResponse;
import com.doan.ProFit.entity.Category;
import com.doan.ProFit.entity.Product;
import com.doan.ProFit.repository.CategoryRepository;
import com.doan.ProFit.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductServiceImpl implements ProductService {
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Override
    public List<ProductResponse> getAllProducts() {
        return productRepository.findByIsActiveTrueAndDeletedAtIsNull().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findByIdAndIsActiveTrueAndDeletedAtIsNull(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        return mapToResponse(product);
    }

    @Override
    public Page<ProductResponse> getActiveProducts(Pageable pageable) {
        return productRepository.findByIsActiveTrueAndDeletedAtIsNull(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<ProductResponse> getActiveProductsByCategory(Long categoryId, Pageable pageable) {
        return productRepository.findByCategoryIdAndIsActiveTrueAndDeletedAtIsNull(categoryId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<ProductResponse> searchActiveProducts(String keyword, Pageable pageable) {
        return productRepository.findByNameContainingIgnoreCaseAndIsActiveTrueAndDeletedAtIsNull(keyword, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public ProductResponse createProduct(ProductRequest request) {
        Product product = new Product();
        product.setSku(request.getSku());
        product.setSlug(request.getSlug());
        product.setName(request.getName());
        product.setShortDescription(request.getShortDescription());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setOldPrice(request.getOldPrice());
        product.setStockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0);
        product.setActive(request.getIsActive() != null ? request.getIsActive() : true);

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
            product.setCategory(category);
        }

        Product saved = productRepository.save(product);
        return mapToResponse(saved);
    }

    @Override
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        product.setSku(request.getSku());
        product.setSlug(request.getSlug());
        product.setName(request.getName());
        product.setShortDescription(request.getShortDescription());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setOldPrice(request.getOldPrice());
        if (request.getStockQuantity() != null) product.setStockQuantity(request.getStockQuantity());
        if (request.getIsActive() != null) product.setActive(request.getIsActive());

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
            product.setCategory(category);
        } else {
            product.setCategory(null);
        }

        Product saved = productRepository.save(product);
        return mapToResponse(saved);
    }

    @Override
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        product.setDeletedAt(LocalDateTime.now());
        product.setActive(false);
        productRepository.save(product);
    }

    private ProductResponse mapToResponse(Product product) {
        ProductResponse response = new ProductResponse();
        response.setId(product.getId());
        response.setSku(product.getSku());
        response.setSlug(product.getSlug());
        response.setName(product.getName());
        response.setShortDescription(product.getShortDescription());
        response.setDescription(product.getDescription());
        response.setPrice(product.getPrice());
        response.setOldPrice(product.getOldPrice());
        response.setRatingAvg(product.getRatingAvg());
        response.setRatingCount(product.getRatingCount());
        response.setStockQuantity(product.getStockQuantity());
        response.setIsActive(product.getActive());

        if (product.getCategory() != null) {
            response.setCategoryId(product.getCategory().getId());
            response.setCategoryName(product.getCategory().getName());
        }
        return response;
    }
}
