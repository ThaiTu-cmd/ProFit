package com.doan.ProFit.controller.api;

import com.doan.ProFit.config.VNPayConfig;
import com.doan.ProFit.entity.Order;
import com.doan.ProFit.repository.OrderRepository;
import com.doan.ProFit.service.VNPayService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payment")
public class VNPayController {

    @Autowired
    private VNPayService vnPayService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private VNPayConfig vnPayConfig;

    /**
     * Test endpoint - verify payment URL generation
     * MINIMAL version with only required params
     */
    @GetMapping("/test")
    public @ResponseBody Map<String, Object> testPayment() {
        Map<String, Object> result = new HashMap<>();
        
        // MINIMAL params - only required fields
        Map<String, String> testParams = new LinkedHashMap<>();
        testParams.put("vnp_Version", "2.1.0");
        testParams.put("vnp_Command", "pay");
        testParams.put("vnp_TmnCode", "SY273SZH");
        testParams.put("vnp_Amount", "1000000"); // 10,000 VND (must be integer)
        testParams.put("vnp_CurrCode", "VND");
        testParams.put("vnp_TxnRef", "TEST123"); // Simple TxnRef
        testParams.put("vnp_OrderType", "other");
        testParams.put("vnp_Locale", "vn");
        testParams.put("vnp_ReturnUrl", "http://localhost:8080/ProFitSuppsDB/api/v1/payment/vnpay-return");
        testParams.put("vnp_IpAddr", "127.0.0.1");
        testParams.put("vnp_CreateDate", "20240524200000");
        
        // NO ExpireDate for minimal test
        
        // Build hash data manually for verification
        StringBuilder hashData = new StringBuilder();
        java.util.List<String> sortedKeys = new java.util.ArrayList<>(testParams.keySet());
        java.util.Collections.sort(sortedKeys);
        
        for (int i = 0; i < sortedKeys.size(); i++) {
            String key = sortedKeys.get(i);
            if (hashData.length() > 0) hashData.append('&');
            hashData.append(key).append('=').append(testParams.get(key));
        }
        
        String hash = vnPayConfig.hmacSHA512(hashData.toString(), "SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT");
        
        // Build URL manually
        StringBuilder url = new StringBuilder("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?");
        for (int i = 0; i < sortedKeys.size(); i++) {
            String key = sortedKeys.get(i);
            if (i > 0) url.append("&");
            url.append(key).append("=").append(testParams.get(key));
        }
        url.append("&vnp_SecureHash=").append(hash);
        
        result.put("hashData", hashData.toString());
        result.put("calculatedHash", hash);
        result.put("paymentUrl", url.toString());
        result.put("paramCount", sortedKeys.size());
        
        return result;
    }

    @GetMapping("/create/{orderId}")
    public @ResponseBody Map<String, String> createPayment(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        BigDecimal amount = order.getTotalAmount();
        String paymentUrl = vnPayService.createPaymentUrl(orderId, amount);

        return Map.of("paymentUrl", paymentUrl);
    }

    @GetMapping("/vnpay-return")
    public void vnpayReturn(
            @RequestParam Map<String, String> params,
            HttpServletResponse response) throws IOException {

        System.out.println("=== VNPay Return Received ===");
        params.forEach((key, value) -> System.out.println(key + ": " + value));
        System.out.println("============================");

        // VALIDATE SIGNATURE FOR SECURITY
        boolean isValid = vnPayService.validateReturn(params);
        
        String status;
        String message;
        String txnRef = params.get("vnp_TxnRef");
        String orderCode = vnPayService.extractOrderCodeFromTxnRef(txnRef);
        String vnpResponseCode = params.get("vnp_ResponseCode");

        System.out.println("Extracted OrderCode: " + orderCode);
        System.out.println("Response Code: " + vnpResponseCode);
        System.out.println("Signature Valid: " + isValid);

        if (!isValid) {
            status = "error";
            message = "Chu ky khong hop le!";
        } else {
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

        String encodedMsg = URLEncoder.encode(message, StandardCharsets.UTF_8);
        String encodedCode = orderCode != null ? URLEncoder.encode(orderCode, StandardCharsets.UTF_8) : "";
        String redirectUrl = String.format(
            "%s/payment-result?status=%s&message=%s&orderCode=%s",
            vnPayConfig.getFrontendBaseUrl(), status, encodedMsg, encodedCode
        );

        System.out.println("Redirecting to: " + redirectUrl);
        response.sendRedirect(redirectUrl);
    }

    @PostMapping("/vnpay-ipn")
    public @ResponseBody String vnpayIpn(@RequestParam Map<String, String> params) {
        System.out.println("=== VNPay IPN Received ===");
        params.forEach((key, value) -> System.out.println(key + ": " + value));
        System.out.println("=========================");

        boolean isValid = vnPayService.validateIpn(params);
        if (!isValid) {
            System.out.println("IPN: Invalid signature");
            return "INVALID_SIGNATURE";
        }

        String txnRef = params.get("vnp_TxnRef");
        String orderCode = vnPayService.extractOrderCodeFromTxnRef(txnRef);
        String vnpResponseCode = params.get("vnp_ResponseCode");

        if ("00".equals(vnpResponseCode)) {
            vnPayService.updateOrderPaymentStatus(orderCode, "PAID", params.get("vnp_TransactionNo"));
            System.out.println("IPN: Order " + orderCode + " marked as PAID");
        } else {
            vnPayService.updateOrderPaymentStatus(orderCode, "FAILED", null);
            System.out.println("IPN: Order " + orderCode + " marked as FAILED");
        }

        return "OK";
    }
}
