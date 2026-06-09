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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));
        return mapToResponse(order);
    }

    @Override
    public List<OrderResponse> getMyOrders(String email) {
        return orderRepository.findByUserEmailOrderByCreatedAtDesc(email).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public OrderResponse createOrder(OrderRequest request, String email) {
        // 1. Tìm user đang đặt hàng dựa vào email trong Token
        User user = userRepository.findByEmailOrPhone(email, email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // 2. Khởi tạo một đơn hàng mới (Order) và điền thông tin giao hàng
        Order order = new Order();
        order.setUser(user);
        // Tạo mã đơn hàng ngẫu nhiên (ví dụ: ORD-A1B2C3D4)
        order.setOrderCode("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setRecipientName(request.getRecipientName());
        order.setRecipientPhone(request.getRecipientPhone());
        order.setShippingAddressLine1(request.getShippingAddressLine1());
        order.setShippingCity(request.getShippingCity());
        order.setShippingProvince(request.getShippingProvince());
        order.setNote(request.getNote());

        BigDecimal total = BigDecimal.ZERO;

        // 3. Duyệt qua từng sản phẩm trong giỏ hàng gửi lên
        for (OrderItemRequest itemReq : request.getItems()) {
            // Phải query thẳng vào DB để lấy giá sản phẩm chính xác, KHÔNG tin tưởng giá do FE gửi lên (chống hack)
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemReq.getProductId()));
            
            OrderItem item = new OrderItem();
            item.setOrder(order); // Liên kết item này thuộc về order nào
            item.setProduct(product);
            item.setProductName(product.getName());
            item.setProductSku(product.getSku());
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(product.getPrice()); // Lưu lại giá tại thời điểm mua
            
            // Tính thành tiền của dòng này = giá * số lượng
            item.setLineTotal(product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity())));
            
            order.getItems().add(item); // Thêm item vào danh sách của order
            total = total.add(item.getLineTotal()); // Cộng dồn vào tổng tiền đơn hàng
        }

        // 4. Lưu tổng tiền
        order.setSubtotal(total);
        order.setTotalAmount(total); // Ở đây đang tạm giản lược chưa cộng phí ship hay trừ mã giảm giá

        // 5. Lưu xuống Database (Nhờ cấu hình CascadeType.ALL, nó sẽ tự động lưu luôn các OrderItem bên trong)
        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Override
    public OrderResponse createGuestOrder(GuestOrderRequest request) {
        // Tìm guest user cho đơn hàng vãng lai
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

        // Duyệt qua từng sản phẩm
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
    public OrderResponse updateOrderStatus(Long id, OrderStatusUpdateRequest request) {
        return updateOrderStatusInternal(id, request, true);
    }

    @Override
    public OrderResponse updateOrderStatusByAdmin(Long id, OrderStatusUpdateRequest request) {
        return updateOrderStatusInternal(id, request, true);
    }

    private OrderResponse updateOrderStatusInternal(Long id, OrderStatusUpdateRequest request, boolean adminOverride) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        String oldStatus = order.getStatus();
        String oldPaymentStatus = order.getPaymentStatus();
        String newStatus = request.getStatus();
        boolean stockAlreadyReduced = "COMPLETED".equals(oldStatus);

        if (request.getStatus() != null) {
            // Chỉ admin mới có quyền hủy — kiểm tra trạng thái hợp lệ
            if ("CANCELLED".equals(newStatus)) {
                // Không cho hủy đơn đã giao hoặc đã hoàn thành
                if ("DELIVERED".equals(oldStatus) || "COMPLETED".equals(oldStatus)) {
                    throw new IllegalArgumentException("Không thể hủy đơn đã giao hoặc đã hoàn thành");
                }
                // Khôi phục stock nếu đơn từng được trừ (trường hợp đặc biệt)
                if (!"CANCELLED".equals(oldStatus)) {
                    restoreStock(order);
                }
                // Nếu đang chờ thanh toán banking thì reset paymentStatus về UNPAID
                if ("PENDING_CONFIRM".equals(oldPaymentStatus)) {
                    order.setPaymentStatus("UNPAID");
                }
            }

            order.setStatus(request.getStatus());

            // Khi shipper xác nhận đã giao hàng thành công -> COMPLETED
            if ("COMPLETED".equals(newStatus)) {
                order.setCompletedAt(java.time.LocalDateTime.now());
                reduceStock(order);
            }

            // Khi đơn hàng bị hủy -> Khôi phục lại stock
            if ("CANCELLED".equals(oldStatus) && !"CANCELLED".equals(newStatus)) {
                // Không cần làm gì vì stock chưa bị trừ
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
    public OrderResponse cancelOrder(Long orderId, String userEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        // Kiểm tra quyền: chỉ chủ đơn hoặc guest mới được hủy
        boolean isOwner = order.getUser() != null && userEmail.equals(order.getUser().getEmail());
        boolean isGuest = order.getUser() != null && "__guest__@system.internal".equals(order.getUser().getEmail());
        if (!isOwner && !isGuest) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đơn hàng này");
        }

        String oldStatus = order.getStatus();
        String oldPaymentStatus = order.getPaymentStatus();

        // Chỉ cho phép hủy đơn đang ở PENDING hoặc PENDING_CONFIRM
        if (!"PENDING".equals(oldStatus) && !"PENDING_CONFIRM".equals(oldPaymentStatus)) {
            throw new IllegalArgumentException("Chỉ có thể hủy đơn hàng đang chờ xác nhận");
        }

        // Nếu là banking pending thì reset paymentStatus về UNPAID
        if ("PENDING_CONFIRM".equals(oldPaymentStatus)) {
            order.setPaymentStatus("UNPAID");
        }
        order.setStatus("CANCELLED");
        order.setCompletedAt(null);

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    /**
     * Trừ số lượng sản phẩm trong kho khi đơn hàng hoàn thành
     */
    private void reduceStock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() != null) {
                Product product = item.getProduct();
                int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
                int orderedQty = item.getQuantity() != null ? item.getQuantity() : 0;
                int newStock = currentStock - orderedQty;
                product.setStockQuantity(Math.max(0, newStock)); // Không cho phép âm
                productRepository.save(product);
            }
        }
    }

    /**
     * Khôi phục số lượng sản phẩm trong kho khi đơn hàng bị hủy
     */
    private void restoreStock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() != null) {
                Product product = item.getProduct();
                int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
                int orderedQty = item.getQuantity() != null ? item.getQuantity() : 0;
                product.setStockQuantity(currentStock + orderedQty);
                productRepository.save(product);
            }
        }
    }

    @Override
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
    public long countPendingConfirmOrders() {
        return orderRepository.countByPaymentStatus("PENDING_CONFIRM");
    }

    @Override
    public void updateVNPayTxnRef(String orderCode, String txnRef) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderCode));
        order.setVnpTxnRef(txnRef);
        order.setPaymentMethod("VNPAY");
        orderRepository.save(order);
    }

    @Override
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
    public void updatePaymentFailed(String orderCode) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderCode));
        order.setPaymentStatus("FAILED");
        orderRepository.save(order);
    }

    @Override
    public DashboardStatsResponse getDashboardStats() {
        DashboardStatsResponse stats = new DashboardStatsResponse();
        LocalDateTime now = LocalDateTime.now();

        // Basic counts
        stats.setTotalOrders(orderRepository.count());
        stats.setPendingOrders(orderRepository.countByStatus("PENDING"));
        stats.setConfirmedOrders(orderRepository.countByStatus("CONFIRMED"));
        stats.setDeliveredOrders(orderRepository.countByStatus("DELIVERED"));
        stats.setCancelledOrders(orderRepository.countByStatus("CANCELLED"));
        stats.setPendingConfirmOrders(orderRepository.countByPaymentStatus("PENDING_CONFIRM"));
        stats.setCompletedOrders(
            orderRepository.countByStatus("COMPLETED") + orderRepository.countByStatus("DELIVERED")
        );

        // Revenue calculations - only COMPLETED and DELIVERED orders count as revenue
        stats.setTotalRevenue(orderRepository.sumRevenueFromCompletedOrders());

        // Today's stats
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        stats.setTodayOrders(orderRepository.countCompletedOrdersToday(startOfDay));
        stats.setTodayRevenue(orderRepository.sumRevenueToday(startOfDay));

        // This month
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        stats.setMonthRevenue(orderRepository.sumRevenueThisMonth(startOfMonth));

        // This year
        LocalDateTime startOfYear = LocalDate.now().withDayOfYear(1).atStartOfDay();
        stats.setYearRevenue(orderRepository.sumRevenueThisYear(startOfYear));

        // Revenue by day (last 30 days)
        LocalDateTime thirtyDaysAgo = startOfDay.minusDays(29);
        List<Object[]> dailyData = orderRepository.sumRevenueByDay(thirtyDaysAgo);
        List<RevenueByPeriod> revenueByDay = new ArrayList<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("dd/MM");
        // Fill in all 30 days (including zeros)
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

        // Revenue by month (last 12 months)
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

        // Revenue by year (last 5 years)
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

        // Best selling products
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
            List<OrderItemResponse> itemResponses = order.getItems().stream().map(this::mapItemToResponse).collect(Collectors.toList());
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
