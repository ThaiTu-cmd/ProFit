package com.doan.ProFit.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Configuration
public class VNPayConfig {

    @Value("${app.vnpay.tmn-code}")
    private String vnpTmnCode;

    @Value("${app.vnpay.hash-secret}")
    private String vnpHashSecret;

    @Value("${app.vnpay.payment-url}")
    private String vnpPaymentUrl;

    @Value("${app.vnpay.return-url}")
    private String vnpReturnUrl;

    @Value("${app.vnpay.ipn-url}")
    private String vnpIpnUrl;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public String getVnpTmnCode() {
        return vnpTmnCode;
    }

    public String getVnpHashSecret() {
        return vnpHashSecret;
    }

    public String getVnpPaymentUrl() {
        return vnpPaymentUrl;
    }

    public String getVnpReturnUrl() {
        return vnpReturnUrl;
    }

    public String getVnpIpnUrl() {
        return vnpIpnUrl;
    }

    public String getFrontendBaseUrl() {
        return frontendBaseUrl;
    }

    public String getVnpApiUrl() {
        return "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    }

    public String md5(String message) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] bytes = md.digest(message.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("MD5 error", e);
        }
    }

    public String sha256(String message) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(message.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 error", e);
        }
    }

    public String hmacSHA512(String data, String key) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac.init(secretKey);
            byte[] bytes = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC SHA-512 error", e);
        }
    }

    public String hmacSHA256(String data, String key) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);
            byte[] bytes = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC SHA-256 error", e);
        }
    }

    /**
     * Tạo payment URL với hash theo chuẩn VNPay
     * Hash format: field1=value1&field2=value2... (sorted alphabetically)
     */
    public String getPaymentUrl(Map<String, String> params) {
        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        for (int i = 0; i < fieldNames.size(); i++) {
            String fieldName = fieldNames.get(i);
            String value = params.get(fieldName);

            // Chỉ include params có giá trị
            if (value != null && !value.isEmpty()) {
                if (hashData.length() > 0) {
                    hashData.append('&');
                }
                hashData.append(fieldName).append('=').append(value);

                if (query.length() > 0) {
                    query.append('&');
                }
                query.append(URLEncoder.encode(fieldName, StandardCharsets.UTF_8))
                     .append('=')
                     .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
            }
        }

        String queryUrl = query.toString();
        String vnpSecureHash = hmacSHA512(hashData.toString(), vnpHashSecret);

        return vnpPaymentUrl + "?" + queryUrl + "&vnp_SecureHash=" + vnpSecureHash;
    }

    /**
     * Validate signature từ VNPay return/IPN
     * Hash format phải GIỐNG như khi tạo URL
     */
    public boolean validateSignature(Map<String, String> params, String serverHash) {
        // Lấy SecureHashType để biết dùng thuật toán nào (mặc định SHA512)
        String secureHashType = params.get("vnp_SecureHashType");
        
        // Clone params để không ảnh hưởng original
        Map<String, String> fields = new HashMap<>(params);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        // Sort keys
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();

        for (int i = 0; i < fieldNames.size(); i++) {
            String fieldName = fieldNames.get(i);
            String value = fields.get(fieldName);

            // Chỉ include params có giá trị - GIỐNG NHƯ KHI TẠO URL
            if (value != null && !value.isEmpty()) {
                if (hashData.length() > 0) {
                    hashData.append('&');
                }
                hashData.append(fieldName).append('=').append(value);
            }
        }

        String calculatedHash;
        // VNPay sandbox có thể dùng SHA256 hoặc SHA512
        if ("SHA256".equalsIgnoreCase(secureHashType)) {
            calculatedHash = hmacSHA256(hashData.toString(), vnpHashSecret);
        } else {
            calculatedHash = hmacSHA512(hashData.toString(), vnpHashSecret);
        }

        // Debug log
        System.out.println("=== VNPay Signature Validation ===");
        System.out.println("Hash Data: " + hashData.toString());
        System.out.println("Server Hash: " + serverHash);
        System.out.println("Calculated Hash: " + calculatedHash);
        System.out.println("SecureHashType: " + secureHashType);
        System.out.println("=================================");

        return calculatedHash.equalsIgnoreCase(serverHash);
    }
}
