package com.doan.ProFit.controller.api;

import com.doan.ProFit.entity.Order;
import com.doan.ProFit.repository.OrderRepository;
import com.doan.ProFit.service.VNPayService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
public class VNPayController {

    @Autowired
    private VNPayService vnPayService;

    @Autowired
    private OrderRepository orderRepository;

    @Value("${app.vnpay.return-url}")
    private String vnpReturnUrl;

    @Value("${app.vnpay.frontend-url}")
    private String frontendUrl;

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
    public void vnpayReturn(
            @RequestParam Map<String, String> params,
            HttpServletResponse response) throws IOException {

        boolean isValid = vnPayService.validateReturn(params);
        String status;
        String message;
        String orderCode = params.get("vnp_TxnRef");

        if (!isValid) {
            status = "error";
            message = "Chu ky khong hop le!";
        } else {
            String vnpResponseCode = params.get("vnp_ResponseCode");

            if ("00".equals(vnpResponseCode)) {
                vnPayService.updateOrderPaymentStatus(orderCode, "PAID", params.get("vnp_TransactionNo"));
                status = "success";
                message = "Thanh toan thanh cong!";
            } else {
                vnPayService.updateOrderPaymentStatus(orderCode, "FAILED", null);
                status = "failed";
                message = "Thanh toan that bai! Ma loi: " + vnpResponseCode;
            }
        }

        // Redirect ve frontend page voi query params
        String frontendRedirectUrl = frontendUrl
                + "/payment-result"
                + "?status=" + status
                + "&message=" + URLEncoder.encode(message, StandardCharsets.UTF_8)
                + "&orderCode=" + URLEncoder.encode(orderCode != null ? orderCode : "", StandardCharsets.UTF_8);

        response.sendRedirect(frontendRedirectUrl);
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
