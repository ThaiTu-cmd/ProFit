package com.doan.ProFit.service;

import com.doan.ProFit.config.VNPayConfig;
import com.doan.ProFit.entity.Order;
import com.doan.ProFit.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class VNPayService {

    @Autowired
    private VNPayConfig vnPayConfig;

    @Autowired
    private OrderRepository orderRepository;

    public String createPaymentUrl(Long orderId, BigDecimal amount) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

        order.incrementPaymentAttempts();
        orderRepository.save(order);

        // Các tham số bắt buộc
        String vnpVersion = "2.1.0";
        String vnpCommand = "pay";
        String vnpTmnCode = vnPayConfig.getVnpTmnCode();
        long amountLong = amount.multiply(BigDecimal.valueOf(100)).longValue();
        String vnpCurrCode = "VND";
        String vnpLocale = "vn";
        String vnpOrderType = "other";

        // TxnRef: chỉ alphanumeric, không có dấu -
        String rawOrderCode = order.getOrderCode().replace("-", "");
        String vnpTxnRef = rawOrderCode + order.getPaymentAttempts();
        
        String vnpIpAddr = "127.0.0.1";
        String vnpReturnUrl = vnPayConfig.getVnpReturnUrl();

        // Tạo timestamp
        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnpCreateDate = formatter.format(cld.getTime());
        
        cld.add(Calendar.MINUTE, 15);
        String vnpExpireDate = formatter.format(cld.getTime());

        // Build params map - thứ tự sẽ được sort trong getPaymentUrl
        Map<String, String> vnpParams = new LinkedHashMap<>();
        vnpParams.put("vnp_Version", vnpVersion);
        vnpParams.put("vnp_Command", vnpCommand);
        vnpParams.put("vnp_TmnCode", vnpTmnCode);
        vnpParams.put("vnp_Amount", String.valueOf(amountLong));
        vnpParams.put("vnp_CurrCode", vnpCurrCode);
        vnpParams.put("vnp_TxnRef", vnpTxnRef);
        vnpParams.put("vnp_OrderType", vnpOrderType);
        vnpParams.put("vnp_Locale", vnpLocale);
        vnpParams.put("vnp_ReturnUrl", vnpReturnUrl);
        vnpParams.put("vnp_IpAddr", vnpIpAddr);
        vnpParams.put("vnp_CreateDate", vnpCreateDate);
        vnpParams.put("vnp_ExpireDate", vnpExpireDate);

        String paymentUrl = vnPayConfig.getPaymentUrl(vnpParams);
        
        // Debug log
        System.out.println("=== VNPay Payment URL Created ===");
        System.out.println("TxnRef: " + vnpTxnRef);
        System.out.println("Amount: " + amountLong);
        System.out.println("Payment URL: " + paymentUrl);
        System.out.println("=================================");
        
        return paymentUrl;
    }

    public String extractOrderCodeFromTxnRef(String txnRef) {
        if (txnRef == null || txnRef.isEmpty()) {
            return txnRef;
        }
        
        // TxnRef format: ORDXXXXXXXX + paymentAttempts (VD: ORDABC123451)
        // Original order code: ORD-XXXXXXXX (VD: ORD-ABC12345)
        
        // Tìm vị trí bắt đầu của paymentAttempts (chữ số cuối cùng trở về)
        int i = txnRef.length() - 1;
        while (i >= 0 && Character.isDigit(txnRef.charAt(i))) {
            i--;
        }
        
        // Phần còn lại là order code không có dấu -
        String orderCodeNoHyphen = txnRef.substring(0, i + 1);
        
        // Thêm lại dấu - để match với format trong DB
        // Format: ORD-XXXXXXXX (10 ký tự với dấu -)
        if (orderCodeNoHyphen.length() == 10 && orderCodeNoHyphen.startsWith("ORD")) {
            return orderCodeNoHyphen.substring(0, 3) + "-" + orderCodeNoHyphen.substring(3);
        }
        
        // Fallback: thử cách khác
        if (txnRef.startsWith("ORD")) {
            // Tìm vị trí số bắt đầu (sau ORD)
            int numStart = 3;
            while (numStart < txnRef.length() && !Character.isDigit(txnRef.charAt(numStart))) {
                numStart++;
            }
            if (numStart < txnRef.length()) {
                // Lấy phần order code (không có paymentAttempts)
                String orderPart = txnRef.substring(0, numStart);
                // Format lại thành ORD-XXXXXXXX
                String digits = txnRef.substring(numStart);
                if (digits.length() > 0) {
                    int attempts = Integer.parseInt(digits);
                    int expectedCodeLength = 10;
                    if (orderPart.length() + digits.length() == expectedCodeLength) {
                        return orderPart.substring(0, 3) + "-" + orderPart.substring(3) + digits.substring(0, digits.length() - String.valueOf(attempts).length());
                    }
                }
            }
        }
        
        return txnRef;
    }

    public boolean validateReturn(Map<String, String> params) {
        String vnpSecureHash = params.get("vnp_SecureHash");
        if (vnpSecureHash == null || vnpSecureHash.isEmpty()) {
            System.out.println("VNPay Return: Missing secure hash");
            return false;
        }
        
        System.out.println("VNPay Return Params: " + params);
        return vnPayConfig.validateSignature(params, vnpSecureHash);
    }

    public boolean validateIpn(Map<String, String> params) {
        String vnpSecureHash = params.get("vnp_SecureHash");
        if (vnpSecureHash == null || vnpSecureHash.isEmpty()) {
            return false;
        }
        return vnPayConfig.validateSignature(params, vnpSecureHash);
    }

    public void updateOrderPaymentStatus(String orderCode, String paymentStatus, String transactionNo) {
        Order order = orderRepository.findByOrderCode(orderCode);
        if (order == null) {
            throw new IllegalArgumentException("Order not found: " + orderCode);
        }
        order.setPaymentStatus(paymentStatus);
        if ("PAID".equals(paymentStatus)) {
            order.setStatus("CONFIRMED");
        }
        orderRepository.save(order);
    }

    public String getResponseCode(String vnpResponseCode) {
        return switch (vnpResponseCode) {
            case "00" -> "PAID";
            case "07" -> "SUSPECT";
            case "09" -> "UNPAID";
            default -> "UNPAID";
        };
    }
}
