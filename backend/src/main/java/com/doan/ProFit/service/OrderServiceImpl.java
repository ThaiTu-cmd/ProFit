package com.doan.ProFit.service;

import com.doan.ProFit.dto.request.GuestOrderRequest;
import com.doan.ProFit.dto.request.GuestOrderRequest;
import com.doan.ProFit.dto.request.OrderItemRequest;
import com.doan.ProFit.dto.request.OrderRequest;
import com.doan.ProFit.dto.request.OrderStatusUpdateRequest;
import com.doan.ProFit.dto.response.OrderItemResponse;
import com.doan.ProFit.dto.response.OrderResponse;
import com.doan.ProFit.entity.Order;
import com.doan.ProFit.entity.OrderItem;
import com.doan.ProFit.entity.Product;
import com.doan.ProFit.repository.OrderRepository;
import com.doan.ProFit.repository.ProductRepository;
import com.doan.ProFit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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
        // Khởi tạo đơn hàng cho khách vãng lai (không liên kết với user)
        Order order = new Order();
        order.setUser(null); // Khách vãng lai
        order.setOrderCode("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setRecipientName(request.getRecipientName());
        order.setRecipientPhone(request.getRecipientPhone());
        order.setShippingAddressLine1(request.getShippingAddressLine1());
        order.setShippingCity(request.getShippingCity());
        order.setShippingProvince(request.getShippingProvince());
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
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (request.getStatus() != null) {
            order.setStatus(request.getStatus());
        }
        if (request.getPaymentStatus() != null) {
            order.setPaymentStatus(request.getPaymentStatus());
        }

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
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
