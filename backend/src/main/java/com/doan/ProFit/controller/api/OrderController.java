package com.doan.ProFit.controller.api;

import com.doan.ProFit.dto.request.GuestOrderRequest;
import com.doan.ProFit.dto.request.OrderRequest;
import com.doan.ProFit.dto.response.OrderResponse;
import com.doan.ProFit.service.OrderService;
import jakarta.validation.Valid;
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
    public ResponseEntity<?> createOrder(@Valid @RequestBody OrderRequest request, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Unauthorized", "message", "Vui lòng đăng nhập để đặt hàng"));
        }
        String email = authentication.getName();
        try {
            OrderResponse response = orderService.createOrder(request, email);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Bad Request", "message", ex.getMessage()));
        }
    }

    @PostMapping("/guest")
    public ResponseEntity<OrderResponse> createGuestOrder(@Valid @RequestBody GuestOrderRequest request) {
        OrderResponse response = orderService.createGuestOrder(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-orders")
    public ResponseEntity<?> getMyOrders(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Unauthorized", "message", "Vui lòng đăng nhập"));
        }
        String email = authentication.getName();
        List<OrderResponse> response = orderService.getMyOrders(email);
        return ResponseEntity.ok(response);
    }

    /**
     * User tự hủy đơn hàng của mình (chỉ PENDING hoặc PENDING_CONFIRM)
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Unauthorized", "message", "Vui lòng đăng nhập"));
        }
        try {
            OrderResponse response = orderService.cancelOrder(id, authentication.getName());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Bad Request", "message", ex.getMessage()));
        }
    }
}
