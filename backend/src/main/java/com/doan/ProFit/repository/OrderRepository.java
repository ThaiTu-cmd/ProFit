package com.doan.ProFit.repository;

import com.doan.ProFit.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByUserEmailOrderByCreatedAtDesc(String email);
    Order findByOrderCode(String orderCode);
    
    // Find orders by payment status
    List<Order> findByPaymentStatusOrderByCreatedAtDesc(String paymentStatus);
    
    // Find orders by status
    List<Order> findByStatusOrderByCreatedAtDesc(String status);
    
    // Count orders by payment status
    long countByPaymentStatus(String paymentStatus);
}
