package com.doan.ProFit.controller.api;

import com.doan.ProFit.dto.request.OrderRequest;
import com.doan.ProFit.dto.response.OrderResponse;
import com.doan.ProFit.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @PostMapping("/create")
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request, Authentication authentication) {
        // Lấy thông tin email (username) của người dùng hiện tại từ Token JWT gửi lên
        String email = authentication.getName(); 
        OrderResponse response = orderService.createOrder(request, email);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderResponse>> getMyOrders(Authentication authentication) {
        // Lấy thông tin email (username) của người dùng hiện tại từ Token JWT gửi lên
        String email = authentication.getName();
        List<OrderResponse> response = orderService.getMyOrders(email);
        return ResponseEntity.ok(response);
    }
}
