package com.doan.ProFit.service;

import com.doan.ProFit.dto.request.ProductRequest;
import com.doan.ProFit.dto.response.ProductResponse;

import java.util.List;

public interface ProductService {
    List<ProductResponse> getAllProducts();
    ProductResponse createProduct(ProductRequest request);
    ProductResponse updateProduct(Long id, ProductRequest request);
    void deleteProduct(Long id);
}
