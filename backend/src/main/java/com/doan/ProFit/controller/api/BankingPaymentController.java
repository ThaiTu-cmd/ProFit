package com.doan.ProFit.controller.api;

import com.doan.ProFit.dto.response.OrderResponse;
import com.doan.ProFit.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/banking")
public class BankingPaymentController {

    @Autowired
    private OrderService orderService;

    /**
     * User gửi yêu cầu xác nhận đã chuyển khoản ngân hàng
     * Chuyển paymentStatus từ UNPAID sang PENDING_CONFIRM
     */
    @PostMapping("/confirm/{orderId}")
    public ResponseEntity<?> confirmBankingPayment(
            @PathVariable Long orderId,
            Authentication authentication) {
        
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized", "message", "Vui lòng đăng nhập"));
        }

        try {
            OrderResponse response = orderService.confirmBankingPayment(orderId, authentication.getName());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", ex.getMessage()));
        }
    }

    /**
     * Lấy số lượng đơn chờ xác nhận thanh toán (cho admin notification)
     */
    @GetMapping("/pending-count")
    public ResponseEntity<?> getPendingConfirmCount() {
        long count = orderService.countPendingConfirmOrders();
        return ResponseEntity.ok(Map.of("count", count));
    }
}
