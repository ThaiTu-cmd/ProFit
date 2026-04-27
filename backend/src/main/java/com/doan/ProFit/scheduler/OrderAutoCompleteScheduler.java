package com.doan.ProFit.scheduler;

import com.doan.ProFit.entity.Order;
import com.doan.ProFit.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class OrderAutoCompleteScheduler {

    private static final Logger log = LoggerFactory.getLogger(OrderAutoCompleteScheduler.class);

    @Autowired
    private OrderRepository orderRepository;

    // Chạy mỗi ngày lúc 2:00 sáng
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void autoCompleteDeliveredOrders() {
        log.info("[Scheduler] Bat dau kiem tra don hang tu dong giao thanh cong");

        LocalDateTime threshold = LocalDateTime.now().minusDays(7);

        List<Order> expiredOrders = orderRepository.findAll().stream()
                .filter(o -> "SHIPPING".equals(o.getStatus()))
                .filter(o -> o.getPlacedAt() != null && o.getPlacedAt().isBefore(threshold))
                .toList();

        for (Order order : expiredOrders) {
            order.setStatus("DELIVERED");
            orderRepository.save(order);
            log.info("[Scheduler] Tu dong danh dau giao thanh cong: {}", order.getOrderCode());
        }

        log.info("[Scheduler] Hoan thanh - {} don duoc danh dau giao thanh cong", expiredOrders.size());
    }
}
