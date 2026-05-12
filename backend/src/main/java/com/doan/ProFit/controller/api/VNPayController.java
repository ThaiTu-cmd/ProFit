package com.doan.ProFit.controller.api;

import com.doan.ProFit.entity.Order;
import com.doan.ProFit.repository.OrderRepository;
import com.doan.ProFit.service.VNPayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payment")
public class VNPayController {

    @Autowired
    private VNPayService vnPayService;

    @Autowired
    private OrderRepository orderRepository;

    @GetMapping("/create/{orderId}")
    public ResponseEntity<Map<String, String>> createPayment(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        BigDecimal amount = order.getTotalAmount();
        String paymentUrl = vnPayService.createPaymentUrl(orderId, amount);

        Map<String, String> response = new HashMap<>();
        response.put("paymentUrl", paymentUrl);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/vnpay-return")
    public ResponseEntity<Map<String, String>> vnpayReturn(
            @RequestParam Map<String, String> params) {

        Map<String, String> result = new HashMap<>();

        boolean isValid = vnPayService.validateReturn(params);
        if (!isValid) {
            result.put("status", "error");
            result.put("message", "Chu ky khong hop le!");
            return ResponseEntity.ok(result);
        }

        String vnpResponseCode = params.get("vnp_ResponseCode");
        String orderCode = params.get("vnp_TxnRef");

        if ("00".equals(vnpResponseCode)) {
            vnPayService.updateOrderPaymentStatus(orderCode, "PAID", params.get("vnp_TransactionNo"));
            result.put("status", "success");
            result.put("message", "Thanh toan thanh cong!");
            result.put("orderCode", orderCode);
        } else {
            vnPayService.updateOrderPaymentStatus(orderCode, "FAILED", null);
            result.put("status", "failed");
            result.put("message", "Thanh toan that bai!");
            result.put("orderCode", orderCode);
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/vnpay-ipn")
    public ResponseEntity<String> vnpayIpn(@RequestParam Map<String, String> params) {
        boolean isValid = vnPayService.validateIpn(params);
        if (!isValid) {
            return ResponseEntity.badRequest().body("INVALID_SIGNATURE");
        }

        String vnpResponseCode = params.get("vnp_ResponseCode");
        String orderCode = params.get("vnp_TxnRef");

        if ("00".equals(vnpResponseCode)) {
            vnPayService.updateOrderPaymentStatus(orderCode, "PAID", params.get("vnp_TransactionNo"));
        } else {
            vnPayService.updateOrderPaymentStatus(orderCode, "FAILED", null);
        }

        return ResponseEntity.ok("OK");
    }
}
