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

        String vnpVersion = "2.1.0";
        String vnpCommand = "pay";
        String vnpOrderType = "other";
        String vnpTxnRef = order.getOrderCode();
        String vnpIpAddr = "127.0.0.1";
        String vnpCurrCode = "VND";
        String vnpLocale = "vn";
        long amountLong = amount.multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, String> vnpParams = new LinkedHashMap<>();
        vnpParams.put("vnp_Version", vnpVersion);
        vnpParams.put("vnp_Command", vnpCommand);
        vnpParams.put("vnp_TmnCode", vnPayConfig.getVnpTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(amountLong));
        vnpParams.put("vnp_CurrCode", vnpCurrCode);
        vnpParams.put("vnp_TxnRef", vnpTxnRef);
        vnpParams.put("vnp_OrderType", vnpOrderType);
        vnpParams.put("vnp_Locale", vnpLocale);
        vnpParams.put("vnp_ReturnUrl", vnPayConfig.getVnpReturnUrl());
        vnpParams.put("vnp_IpAddr", vnpIpAddr);

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnpCreateDate = formatter.format(cld.getTime());
        vnpParams.put("vnp_CreateDate", vnpCreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnpExpireDate = formatter.format(cld.getTime());
        vnpParams.put("vnp_ExpireDate", vnpExpireDate);

        return vnPayConfig.getPaymentUrl(vnpParams);
    }

    public boolean validateReturn(Map<String, String> params) {
        String vnpSecureHash = params.get("vnp_SecureHash");
        if (vnpSecureHash == null || vnpSecureHash.isEmpty()) {
            return false;
        }
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
        List<Order> orders = orderRepository.findAll();
        for (Order order : orders) {
            if (order.getOrderCode().equals(orderCode)) {
                order.setPaymentStatus(paymentStatus);
                if ("PAID".equals(paymentStatus)) {
                    order.setStatus("CONFIRMED");
                }
                orderRepository.save(order);
                return;
            }
        }
        throw new IllegalArgumentException("Order not found: " + orderCode);
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
