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
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request, Authentication authentication) {
        String email = authentication.getName();
        OrderResponse response = orderService.createOrder(request, email);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/guest")
    public ResponseEntity<OrderResponse> createGuestOrder(@Valid @RequestBody GuestOrderRequest request) {
        OrderResponse response = orderService.createGuestOrder(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderResponse>> getMyOrders(Authentication authentication) {
        String email = authentication.getName();
        List<OrderResponse> response = orderService.getMyOrders(email);
        return ResponseEntity.ok(response);
    }
}
