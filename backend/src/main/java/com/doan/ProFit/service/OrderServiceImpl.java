package com.doan.ProFit.service;

import com.doan.ProFit.dto.request.GuestOrderRequest;
import com.doan.ProFit.dto.request.OrderItemRequest;
import com.doan.ProFit.dto.request.OrderRequest;
import com.doan.ProFit.dto.request.OrderStatusUpdateRequest;
import com.doan.ProFit.dto.response.DashboardStatsResponse;
import com.doan.ProFit.dto.response.DashboardStatsResponse.BestSellingProduct;
import com.doan.ProFit.dto.response.DashboardStatsResponse.RevenueByPeriod;
import com.doan.ProFit.dto.response.OrderItemResponse;
import com.doan.ProFit.dto.response.OrderResponse;
import com.doan.ProFit.entity.Order;
import com.doan.ProFit.entity.OrderItem;
import com.doan.ProFit.entity.Product;
import com.doan.ProFit.entity.User;
import com.doan.ProFit.repository.OrderRepository;
import com.doan.ProFit.repository.ProductRepository;
import com.doan.ProFit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl implements OrderService {
    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return mapToResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(String email) {
        return orderRepository.findByUserEmailOrderByCreatedAtDesc(email).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public OrderResponse createOrder(OrderRequest request, String email) {
        User user = userRepository.findByEmailOrPhone(email, email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Order order = new Order();
        order.setUser(user);
        order.setOrderCode("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setRecipientName(request.getRecipientName());
        order.setRecipientPhone(request.getRecipientPhone());
        order.setShippingAddressLine1(request.getShippingAddressLine1());
        order.setShippingCity(request.getShippingCity());
        order.setShippingProvince(request.getShippingProvince());
        order.setNote(request.getNote());

        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemReq.getProductId()));

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setProductName(product.getName());
            item.setProductSku(product.getSku());
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(product.getPrice());
            item.setLineTotal(product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity())));

            order.getItems().add(item);
            total = total.add(item.getLineTotal());
        }

        order.setSubtotal(total);
        order.setTotalAmount(total);

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse createGuestOrder(GuestOrderRequest request) {
        User guestUser = userRepository.findByEmail("__guest__@system.internal")
                .orElseThrow(() -> new IllegalStateException("Guest user not found. Please restart the application."));

        Order order = new Order();
        order.setUser(guestUser);
        order.setOrderCode("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setRecipientName(request.getRecipientName());
        order.setRecipientPhone(request.getRecipientPhone());
        order.setShippingAddressLine1(request.getShippingAddressLine1());
        order.setShippingCity(request.getShippingCity());
        order.setShippingProvince(request.getShippingProvince() != null ? request.getShippingProvince() : request.getShippingCity());
        order.setNote(request.getNote());

        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemReq.getProductId()));

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setProductName(product.getName());
            item.setProductSku(product.getSku());
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(product.getPrice());
            item.setLineTotal(product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity())));

            order.getItems().add(item);
            total = total.add(item.getLineTotal());
        }

        order.setSubtotal(total);
        order.setTotalAmount(total);

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long id, OrderStatusUpdateRequest request) {
        return updateOrderStatusInternal(id, request, true);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatusByAdmin(Long id, OrderStatusUpdateRequest request) {
        return updateOrderStatusInternal(id, request, true);
    }

    private OrderResponse updateOrderStatusInternal(Long id, OrderStatusUpdateRequest request, boolean adminOverride) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        String oldStatus = order.getStatus();
        String oldPaymentStatus = order.getPaymentStatus();
        String newStatus = request.getStatus();

        if (request.getStatus() != null) {
            if ("CANCELLED".equals(newStatus)) {
                if ("DELIVERED".equals(oldStatus) || "COMPLETED".equals(oldStatus)) {
                    throw new IllegalArgumentException("Không thể hủy đơn đã giao hoặc đã hoàn thành");
                }
                if (!"CANCELLED".equals(oldStatus)) {
                    restoreStock(order);
                }
                if ("PENDING_CONFIRM".equals(oldPaymentStatus)) {
                    order.setPaymentStatus("UNPAID");
                }
            }

            order.setStatus(request.getStatus());

            if ("COMPLETED".equals(newStatus)) {
                order.setCompletedAt(LocalDateTime.now());
                reduceStock(order);
            }
        }

        if (request.getPaymentStatus() != null) {
            order.setPaymentStatus(request.getPaymentStatus());
            if ("PAID".equals(request.getPaymentStatus())) {
                order.setStatus("CONFIRMED");
                if (order.getPaidAt() == null) {
                    order.setPaidAt(LocalDateTime.now());
                }
            }
        }

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId, String userEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        boolean isOwner = order.getUser() != null && userEmail.equals(order.getUser().getEmail());
        boolean isGuest = order.getUser() != null && "__guest__@system.internal".equals(order.getUser().getEmail());
        if (!isOwner && !isGuest) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đơn hàng này");
        }

        String oldStatus = order.getStatus();
        String oldPaymentStatus = order.getPaymentStatus();

        // Chỉ cho phép hủy đơn đang ở PENDING hoặc PENDING_CONFIRM (payment status)
        if (!"PENDING".equals(oldStatus) && !"PENDING_CONFIRM".equals(oldStatus)) {
            throw new IllegalArgumentException("Chỉ có thể hủy đơn hàng đang chờ xác nhận");
        }

        if ("PENDING_CONFIRM".equals(oldPaymentStatus)) {
            order.setPaymentStatus("UNPAID");
        }
        order.setStatus("CANCELLED");
        order.setCompletedAt(null);

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Transactional
    private void reduceStock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() != null) {
                Product product = productRepository.findById(item.getProduct().getId()).orElse(null);
                if (product != null) {
                    int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
                    int orderedQty = item.getQuantity() != null ? item.getQuantity() : 0;
                    int newStock = currentStock - orderedQty;
                    product.setStockQuantity(Math.max(0, newStock));
                    productRepository.save(product);
                }
            }
        }
    }

    @Transactional
    private void restoreStock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() != null) {
                Product product = productRepository.findById(item.getProduct().getId()).orElse(null);
                if (product != null) {
                    int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
                    int orderedQty = item.getQuantity() != null ? item.getQuantity() : 0;
                    product.setStockQuantity(currentStock + orderedQty);
                    productRepository.save(product);
                }
            }
        }
    }

    @Override
    @Transactional
    public OrderResponse confirmBankingPayment(Long orderId, String userEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        boolean isOwner = order.getUser() != null && userEmail.equals(order.getUser().getEmail());
        boolean isGuestOrder = order.getUser() != null && "__guest__@system.internal".equals(order.getUser().getEmail());

        if (!isOwner && !isGuestOrder) {
            throw new IllegalArgumentException("Bạn không có quyền xác nhận đơn hàng này");
        }

        if (!"UNPAID".equals(order.getPaymentStatus())) {
            throw new IllegalArgumentException("Đơn hàng không ở trạng thái chờ thanh toán");
        }

        order.setPaymentMethod("BANKING");
        order.setPaymentStatus("PENDING_CONFIRM");
        order.setPaidAt(LocalDateTime.now());

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public long countPendingConfirmOrders() {
        return orderRepository.countByPaymentStatus("PENDING_CONFIRM");
    }

    @Override
    @Transactional
    public void updateVNPayTxnRef(String orderCode, String txnRef) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderCode));
        order.setVnpTxnRef(txnRef);
        order.setPaymentMethod("VNPAY");
        orderRepository.save(order);
    }

    @Override
    @Transactional
    public void updatePaymentSuccess(String orderCode, String transactionNo) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderCode));
        order.setPaymentStatus("PAID");
        order.setStatus("CONFIRMED");
        order.setVnpTransactionNo(transactionNo);
        order.setPaidAt(LocalDateTime.now());
        orderRepository.save(order);
    }

    @Override
    @Transactional
    public void updatePaymentFailed(String orderCode) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderCode));
        order.setPaymentStatus("FAILED");
        orderRepository.save(order);
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        DashboardStatsResponse stats = new DashboardStatsResponse();

        stats.setTotalOrders(orderRepository.count());
        stats.setPendingOrders(orderRepository.countByStatus("PENDING"));
        stats.setConfirmedOrders(orderRepository.countByStatus("CONFIRMED"));
        stats.setDeliveredOrders(orderRepository.countByStatus("DELIVERED"));
        stats.setCancelledOrders(orderRepository.countByStatus("CANCELLED"));
        stats.setPendingConfirmOrders(orderRepository.countByPaymentStatus("PENDING_CONFIRM"));
        stats.setCompletedOrders(
            orderRepository.countByStatus("COMPLETED") + orderRepository.countByStatus("DELIVERED")
        );

        stats.setTotalRevenue(orderRepository.sumRevenueFromCompletedOrders());

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        stats.setTodayOrders(orderRepository.countCompletedOrdersToday(startOfDay));
        stats.setTodayRevenue(orderRepository.sumRevenueToday(startOfDay));

        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        stats.setMonthRevenue(orderRepository.sumRevenueThisMonth(startOfMonth));

        LocalDateTime startOfYear = LocalDate.now().withDayOfYear(1).atStartOfDay();
        stats.setYearRevenue(orderRepository.sumRevenueThisYear(startOfYear));

        LocalDateTime thirtyDaysAgo = startOfDay.minusDays(29);
        List<Object[]> dailyData = orderRepository.sumRevenueByDay(thirtyDaysAgo);
        List<RevenueByPeriod> revenueByDay = new ArrayList<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("dd/MM");
        for (int i = 29; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dateStr = date.format(dayFormatter);
            final String finalDateStr = dateStr;
            BigDecimal rev = BigDecimal.ZERO;
            long count = 0;
            for (Object[] row : dailyData) {
                if (row[0] != null && row[0].toString().equals(date.toString())) {
                    rev = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
                    count = row[2] != null ? ((Number) row[2]).longValue() : 0;
                    break;
                }
            }
            revenueByDay.add(new RevenueByPeriod(finalDateStr, rev, count));
        }
        stats.setRevenueByDay(revenueByDay);

        LocalDateTime twelveMonthsAgo = startOfMonth.minusMonths(11);
        List<Object[]> monthlyData = orderRepository.sumRevenueByMonth(twelveMonthsAgo);
        List<RevenueByPeriod> revenueByMonth = new ArrayList<>();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MM/yyyy");
        for (int i = 11; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusMonths(i);
            String monthStr = date.format(monthFormatter);
            final String finalMonthStr = monthStr;
            BigDecimal rev = BigDecimal.ZERO;
            long count = 0;
            String targetKey = date.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            for (Object[] row : monthlyData) {
                if (row[0] != null && row[0].toString().equals(targetKey)) {
                    rev = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
                    count = row[2] != null ? ((Number) row[2]).longValue() : 0;
                    break;
                }
            }
            revenueByMonth.add(new RevenueByPeriod(finalMonthStr, rev, count));
        }
        stats.setRevenueByMonth(revenueByMonth);

        LocalDateTime fiveYearsAgo = startOfYear.minusYears(4);
        List<Object[]> yearlyData = orderRepository.sumRevenueByYear(fiveYearsAgo);
        List<RevenueByPeriod> revenueByYear = new ArrayList<>();
        for (int i = 4; i >= 0; i--) {
            int year = LocalDate.now().getYear() - i;
            final int finalYear = year;
            BigDecimal rev = BigDecimal.ZERO;
            long count = 0;
            for (Object[] row : yearlyData) {
                if (row[0] != null && Integer.parseInt(row[0].toString()) == year) {
                    rev = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
                    count = row[2] != null ? ((Number) row[2]).longValue() : 0;
                    break;
                }
            }
            revenueByYear.add(new RevenueByPeriod(String.valueOf(finalYear), rev, count));
        }
        stats.setRevenueByYear(revenueByYear);

        List<Object[]> bestSellingData = orderRepository.findBestSellingProducts(10);
        List<BestSellingProduct> bestSellingProducts = new ArrayList<>();
        for (Object[] row : bestSellingData) {
            Long productId = row[0] != null ? ((Number) row[0]).longValue() : null;
            String productName = row[1] != null ? row[1].toString() : "Unknown";
            long totalSold = row[2] != null ? ((Number) row[2]).longValue() : 0;
            BigDecimal totalRevenue = row[3] != null ? new BigDecimal(row[3].toString()) : BigDecimal.ZERO;
            bestSellingProducts.add(new BestSellingProduct(productId, productName, totalSold, totalRevenue));
        }
        stats.setBestSellingProducts(bestSellingProducts);

        return stats;
    }

    private OrderResponse mapToResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setOrderCode(order.getOrderCode());
        response.setRecipientName(order.getRecipientName());
        response.setRecipientPhone(order.getRecipientPhone());
        response.setShippingAddressLine1(order.getShippingAddressLine1());
        response.setShippingCity(order.getShippingCity());
        response.setShippingProvince(order.getShippingProvince());
        response.setTotalAmount(order.getTotalAmount());
        response.setStatus(order.getStatus());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setPlacedAt(order.getPlacedAt());
        response.setPaidAt(order.getPaidAt());
        response.setDeliveredAt(order.getDeliveredAt());
        response.setCompletedAt(order.getCompletedAt());
        response.setVnpTxnRef(order.getVnpTxnRef());
        response.setVnpTransactionNo(order.getVnpTransactionNo());
        response.setPaymentMethod(order.getPaymentMethod());
        if (order.getUser() != null) {
            response.setUserName(order.getUser().getFullName());
        }
        if (order.getItems() != null) {
            List<OrderItemResponse> itemResponses = order.getItems().stream()
                    .map(this::mapItemToResponse)
                    .collect(Collectors.toList());
            response.setItems(itemResponses);
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
