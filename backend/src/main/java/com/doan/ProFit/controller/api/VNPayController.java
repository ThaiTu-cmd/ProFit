package com.doan.ProFit.controller.api;

import com.doan.ProFit.dto.request.VNPayCreateRequest;
import com.doan.ProFit.entity.Order;
import com.doan.ProFit.repository.OrderRepository;
import com.doan.ProFit.service.OrderService;
import com.doan.ProFit.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/vnpay")
public class VNPayController {

    private static final Logger logger = LoggerFactory.getLogger(VNPayController.class);

    @Autowired
    private VNPayService vnPayService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    /**
     * Tạo URL thanh toán VNPAY
     * Endpoint này hoàn toàn PUBLIC - verify order qua orderCode trong body
     * KHÔNG sử dụng Authentication parameter vì nó gây 401 trên permitAll endpoints
     */
    @PostMapping("/create")
    public ResponseEntity<?> createPayment(
            @RequestBody VNPayCreateRequest request,
            HttpServletRequest httpRequest) {

        try {
            String orderCode = request.getOrderCode();

            // Verify order tồn tại trong DB
            Order order = orderRepository.findByOrderCode(orderCode).orElse(null);

            if (order == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Order not found",
                    "message", "Khong tim thay don hang: " + orderCode
                ));
            }

            // Lấy IP của client
            String ipAddress = getClientIp(httpRequest);

            // Tạo mã tham chiếu giao dịch
            String txnRef = orderCode + "_" + System.currentTimeMillis();

            // Tạo mô tả đơn hàng
            String orderInfo = "Thanh toan don hang " + orderCode + " - ProFit";

            // Chuyển đổi amount từ VND
            long amount = request.getAmount().longValue();

            // Tạo URL thanh toán
            String paymentUrl = vnPayService.createPaymentUrl(
                amount,
                txnRef,
                orderInfo,
                ipAddress,
                request.getLocale()
            );

            // Lưu txnRef vào order
            try {
                orderService.updateVNPayTxnRef(orderCode, txnRef);
            } catch (Exception e) {
                logger.warn("Could not update VNPay txn ref: {}", e.getMessage());
            }

            Map<String, String> response = new HashMap<>();
            response.put("paymentUrl", paymentUrl);
            response.put("txnRef", txnRef);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error creating VNPay payment: ", e);
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Payment creation failed",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * IPN URL - VNPAY gọi server-to-server để thông báo kết quả thanh toán
     * Đây là endpoint quan trọng để cập nhật trạng thái đơn hàng
     */
    @PostMapping("/ipn")
    public ResponseEntity<?> handleIpn(HttpServletRequest request) {
        try {
            // Lấy tất cả parameters từ VNPAY
            Map<String, String> params = getRequestParams(request);
            
            logger.info("VNPay IPN received: {}", params);
            
            // Verify checksum
            if (!vnPayService.verifyIpn(params)) {
                logger.warn("VNPay IPN verification failed");
                return ResponseEntity.ok("{\"RspCode\":\"97\",\"Message\":\"Invalid signature\"}");
            }
            
            // Parse response
            VNPayService.VNPayResponse vnpResponse = vnPayService.parseResponse(params);
            
            // Extract order code từ txnRef (format: ORD-XXXXXXX_timestamp)
            String txnRef = vnpResponse.getTxnRef();
            String orderCode = txnRef;
            if (txnRef.contains("_")) {
                orderCode = txnRef.substring(0, txnRef.lastIndexOf("_"));
            }
            
            // Xử lý kết quả thanh toán
            if (vnpResponse.isSuccess()) {
                // Thanh toán thành công
                orderService.updatePaymentSuccess(orderCode, vnpResponse.getTransactionId());
                logger.info("VNPay payment success for order: {}", orderCode);
                return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}");
            } else {
                // Thanh toán thất bại
                orderService.updatePaymentFailed(orderCode);
                logger.warn("VNPay payment failed for order: {}, response code: {}", 
                    orderCode, vnpResponse.getResponseCode());
                return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}");
            }
            
        } catch (Exception e) {
            logger.error("Error processing VNPay IPN: ", e);
            return ResponseEntity.ok("{\"RspCode\":\"99\",\"Message\":\"System error\"}");
        }
    }

    /**
     * Return URL - VNPAY redirect user về sau khi thanh toán
     */
    @GetMapping("/return")
    public ResponseEntity<?> handleReturn(HttpServletRequest request) {
        try {
            Map<String, String> params = getRequestParams(request);
            
            logger.info("VNPay Return received: {}", params);
            
            // Verify signature
            if (!vnPayService.verifyReturn(params)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid signature"
                ));
            }
            
            VNPayService.VNPayResponse vnpResponse = vnPayService.parseResponse(params);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", vnpResponse.isSuccess());
            response.put("txnRef", vnpResponse.getTxnRef());
            response.put("transactionId", vnpResponse.getTransactionId());
            response.put("amount", vnpResponse.getAmount());
            response.put("responseCode", vnpResponse.getResponseCode());
            response.put("transactionStatus", vnpResponse.getTransactionStatus());
            response.put("bankCode", vnpResponse.getBankCode());
            
            // Extract order code
            String orderCode = vnpResponse.getTxnRef();
            if (vnpResponse.getTxnRef() != null && vnpResponse.getTxnRef().contains("_")) {
                orderCode = vnpResponse.getTxnRef().substring(0, vnpResponse.getTxnRef().lastIndexOf("_"));
            }
            response.put("orderCode", orderCode);
            
            if (vnpResponse.isSuccess()) {
                response.put("message", "Thanh toán thành công!");
            } else {
                response.put("message", "Thanh toán không thành công. Mã lỗi: " + vnpResponse.getResponseCode());
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error processing VNPay return: ", e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Có lỗi xảy ra: " + e.getMessage()
            ));
        }
    }

    /**
     * Lấy IP của client
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // Nếu có nhiều IP, lấy IP đầu tiên
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    /**
     * Lấy tất cả parameters từ request
     */
    private Map<String, String> getRequestParams(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        Map<String, String[]> requestParams = request.getParameterMap();
        for (String name : requestParams.keySet()) {
            String[] values = requestParams.get(name);
            String valueStr = values != null && values.length > 0 ? values[0] : "";
            params.put(name, valueStr);
        }
        return params;
    }
}
