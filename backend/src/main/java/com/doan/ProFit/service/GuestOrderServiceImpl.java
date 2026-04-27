package com.doan.ProFit.service;

import com.doan.ProFit.dto.request.GuestCheckoutRequest;
import com.doan.ProFit.dto.response.GuestCheckoutResponse;
import com.doan.ProFit.dto.response.GuestOrderLookupResponse;
import com.doan.ProFit.dto.response.OrderItemResponse;
import com.doan.ProFit.entity.DiscountCode;
import com.doan.ProFit.entity.Order;
import com.doan.ProFit.entity.OrderItem;
import com.doan.ProFit.entity.Product;
import com.doan.ProFit.entity.User;
import com.doan.ProFit.enums.Role;
import com.doan.ProFit.enums.Status;
import com.doan.ProFit.repository.DiscountCodeRepository;
import com.doan.ProFit.repository.OrderRepository;
import com.doan.ProFit.repository.ProductRepository;
import com.doan.ProFit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GuestOrderServiceImpl implements GuestOrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private DiscountCodeRepository discountCodeRepository;

    @Autowired
    private UserRepository userRepository;

    private static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("500000");
    private static final BigDecimal SHIPPING_FEE = new BigDecimal("30000");

    @Override
    @Transactional
    public GuestCheckoutResponse createGuestOrder(GuestCheckoutRequest request) {
        if (request.getRecipientName() == null || request.getRecipientName().isBlank()) {
            throw new IllegalArgumentException("Ho ten nguoi nhan khong duoc trong");
        }
        if (request.getRecipientPhone() == null || request.getRecipientPhone().isBlank()) {
            throw new IllegalArgumentException("So dien thoai khong duoc trong");
        }
        if (request.getShippingAddressLine1() == null || request.getShippingAddressLine1().isBlank()) {
            throw new IllegalArgumentException("Dia chi giao hang khong duoc trong");
        }
        if (request.getShippingCity() == null || request.getShippingCity().isBlank()) {
            throw new IllegalArgumentException("Thanh pho khong duoc trong");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Danh sach san pham khong duoc trong");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (GuestCheckoutRequest.GuestOrderItemRequest itemReq : request.getItems()) {
            Product product = null;
            if (itemReq.getProductSku() != null && !itemReq.getProductSku().isBlank()) {
                product = productRepository.findBySku(itemReq.getProductSku().trim()).orElse(null);
            }
            if (product == null && itemReq.getProductId() != null) {
                product = productRepository.findById(itemReq.getProductId()).orElse(null);
            }
            if (product == null) {
                throw new IllegalArgumentException("Khong tim thay san pham");
            }

            if (!product.getActive() || product.getDeletedAt() != null) {
                throw new IllegalArgumentException("San pham khong con ban: " + product.getName());
            }

            if (product.getStockQuantity() < itemReq.getQuantity()) {
                throw new IllegalArgumentException(
                        "San pham '" + product.getName() + "' chi con " + product.getStockQuantity() + " trong kho");
            }

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            subtotal = subtotal.add(lineTotal);

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(product);
            orderItem.setProductName(product.getName());
            orderItem.setProductSku(product.getSku());
            orderItem.setQuantity(itemReq.getQuantity());
            orderItem.setUnitPrice(product.getPrice());
            orderItem.setLineTotal(lineTotal);
            orderItems.add(orderItem);

            product.setStockQuantity(product.getStockQuantity() - itemReq.getQuantity());
            productRepository.save(product);
        }

        BigDecimal shippingFee = subtotal.compareTo(FREE_SHIPPING_THRESHOLD) >= 0
                ? BigDecimal.ZERO : SHIPPING_FEE;

        BigDecimal discountAmount = BigDecimal.ZERO;
        String appliedDiscountCode = null;
        if (request.getDiscountCode() != null && !request.getDiscountCode().isBlank()) {
            DiscountCode discount = discountCodeRepository
                    .findByCodeAndDeletedAtIsNull(request.getDiscountCode().trim().toUpperCase())
                    .orElseThrow(() -> new IllegalArgumentException("Ma giam gia khong ton tai"));

            if (!Boolean.TRUE.equals(discount.getActive())) {
                throw new IllegalArgumentException("Ma giam gia da bi vo hieu hoa");
            }
            if (discount.getStartDate() != null && LocalDateTime.now().isBefore(discount.getStartDate())) {
                throw new IllegalArgumentException("Ma giam gia chua bat dau");
            }
            if (discount.getEndDate() != null && LocalDateTime.now().isAfter(discount.getEndDate())) {
                throw new IllegalArgumentException("Ma giam gia da het han");
            }
            if (discount.getUsageLimit() != null && discount.getUsageCount() >= discount.getUsageLimit()) {
                throw new IllegalArgumentException("Ma giam gia da het luot su dung");
            }
            if (discount.getMinOrderAmount() != null
                    && subtotal.compareTo(discount.getMinOrderAmount()) < 0) {
                throw new IllegalArgumentException(
                        "Don hang phai tren " + discount.getMinOrderAmount() + " VND de su dung ma nay");
            }

            if (discount.getDiscountType() == DiscountCode.DiscountType.PERCENTAGE) {
                discountAmount = subtotal.multiply(discount.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            } else {
                discountAmount = discount.getDiscountValue();
            }
            if (discount.getMaxDiscountAmount() != null
                    && discountAmount.compareTo(discount.getMaxDiscountAmount()) > 0) {
                discountAmount = discount.getMaxDiscountAmount();
            }
            appliedDiscountCode = discount.getCode();
            discount.setUsageCount(discount.getUsageCount() + 1);
            discountCodeRepository.save(discount);
        }

        BigDecimal totalAmount = subtotal.add(shippingFee).subtract(discountAmount);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }

        User guestUser = userRepository.findByEmailOrPhone(null, request.getRecipientPhone())
                .orElseGet(() -> {
                    User guest = new User();
                    guest.setFullName(request.getRecipientName());
                    guest.setEmail("guest_" + request.getRecipientPhone() + "@guest.local");
                    guest.setPhone(request.getRecipientPhone());
                    guest.setPasswordHash("");
                    guest.setRole(Role.GUEST);
                    guest.setStatus(Status.ACTIVE);
                    return userRepository.save(guest);
                });

        Order order = new Order();
        order.setUser(guestUser);
        order.setOrderCode(generateOrderCode());
        order.setRecipientName(request.getRecipientName());
        order.setRecipientPhone(request.getRecipientPhone());
        order.setShippingAddressLine1(request.getShippingAddressLine1());
        order.setShippingCity(request.getShippingCity());
        order.setShippingProvince(request.getShippingProvince());
        order.setShippingCountry("Vietnam");
        order.setSubtotal(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setShippingFee(shippingFee);
        order.setTotalAmount(totalAmount);
        order.setStatus("PENDING");
        order.setPaymentStatus("UNPAID");
        order.setNote(request.getNote());
        order.setPlacedAt(LocalDateTime.now());

        for (OrderItem item : orderItems) {
            item.setOrder(order);
        }
        order.setItems(orderItems);

        Order savedOrder = orderRepository.save(order);
        return mapToGuestCheckoutResponse(savedOrder);
    }

    @Override
    public GuestOrderLookupResponse lookupOrderByCodeAndPhone(String orderCode, String phone) {
        Order order = orderRepository.findByOrderCode(orderCode.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay don hang"));

        if (!order.getRecipientPhone().equals(phone.trim())) {
            throw new IllegalArgumentException("So dien thoai khong khop voi don hang");
        }

        return mapToGuestOrderLookupResponse(order);
    }

    @Override
    public List<GuestOrderLookupResponse> lookupOrdersByPhone(String phone) {
        return orderRepository.findByUserPhone(phone.trim())
                .stream()
                .map(this::mapToGuestOrderLookupResponse)
                .collect(Collectors.toList());
    }

    @Override
    public GuestCheckoutResponse applyCoupon(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Ma giam gia khong duoc trong");
        }

        DiscountCode discount = discountCodeRepository
                .findByCodeAndDeletedAtIsNull(code.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Ma giam gia khong ton tai"));

        if (!Boolean.TRUE.equals(discount.getActive())) {
            throw new IllegalArgumentException("Ma giam gia da bi vo hieu hoa");
        }
        if (discount.getStartDate() != null && LocalDateTime.now().isBefore(discount.getStartDate())) {
            throw new IllegalArgumentException("Ma giam gia chua bat dau");
        }
        if (discount.getEndDate() != null && LocalDateTime.now().isAfter(discount.getEndDate())) {
            throw new IllegalArgumentException("Ma giam gia da het han");
        }
        if (discount.getUsageLimit() != null && discount.getUsageCount() >= discount.getUsageLimit()) {
            throw new IllegalArgumentException("Ma giam gia da het luot su dung");
        }

        GuestCheckoutResponse response = new GuestCheckoutResponse();
        response.setOrderCode(discount.getCode());
        response.setSubtotal(discount.getDiscountValue());
        response.setStatus(discount.getDiscountType().name());
        return response;
    }

    private String generateOrderCode() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.format("%04d", (int) (Math.random() * 10000));
        return "PF" + timestamp + random;
    }

    private GuestCheckoutResponse mapToGuestCheckoutResponse(Order order) {
        GuestCheckoutResponse response = new GuestCheckoutResponse();
        response.setOrderId(order.getId());
        response.setOrderCode(order.getOrderCode());
        response.setSubtotal(order.getSubtotal());
        response.setDiscountAmount(order.getDiscountAmount());
        response.setShippingFee(order.getShippingFee());
        response.setTotalAmount(order.getTotalAmount());
        response.setStatus(order.getStatus());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setPlacedAt(order.getPlacedAt());
        if (order.getItems() != null) {
            response.setItems(order.getItems().stream()
                    .map(this::mapItemToResponse)
                    .collect(Collectors.toList()));
        }
        return response;
    }

    private GuestOrderLookupResponse mapToGuestOrderLookupResponse(Order order) {
        GuestOrderLookupResponse response = new GuestOrderLookupResponse();
        response.setOrderId(order.getId());
        response.setOrderCode(order.getOrderCode());
        response.setRecipientName(order.getRecipientName());
        response.setRecipientPhone(order.getRecipientPhone());
        response.setShippingAddressLine1(order.getShippingAddressLine1());
        response.setShippingCity(order.getShippingCity());
        response.setShippingProvince(order.getShippingProvince());
        response.setStatus(order.getStatus());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setPlacedAt(order.getPlacedAt() != null
                ? order.getPlacedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "");
        if (order.getItems() != null) {
            response.setItems(order.getItems().stream()
                    .map(this::mapItemToResponse)
                    .collect(Collectors.toList()));
        }
        return response;
    }

    private OrderItemResponse mapItemToResponse(OrderItem item) {
        OrderItemResponse response = new OrderItemResponse();
        response.setId(item.getId());
        response.setProductId(item.getProduct() != null ? item.getProduct().getId() : null);
        response.setProductName(item.getProductName());
        response.setProductSku(item.getProductSku());
        response.setQuantity(item.getQuantity());
        response.setUnitPrice(item.getUnitPrice());
        response.setLineTotal(item.getLineTotal());
        return response;
    }
}
