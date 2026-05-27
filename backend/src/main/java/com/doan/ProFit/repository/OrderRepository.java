package com.doan.ProFit.repository;

import com.doan.ProFit.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
    
    // Count orders by status
    long countByStatus(String status);
    
    // Revenue: sum totalAmount where status is COMPLETED or DELIVERED (order delivered = revenue realized)
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status IN ('COMPLETED', 'DELIVERED')")
    BigDecimal sumRevenueFromCompletedOrders();
    
    // Today's completed/delivered orders count
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status IN ('COMPLETED', 'DELIVERED') AND o.completedAt >= :startOfDay")
    long countCompletedOrdersToday(@Param("startOfDay") LocalDateTime startOfDay);
    
    // Today's completed/delivered revenue
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status IN ('COMPLETED', 'DELIVERED') AND o.completedAt >= :startOfDay")
    BigDecimal sumRevenueToday(@Param("startOfDay") LocalDateTime startOfDay);
    
    // This month's completed/delivered revenue
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status IN ('COMPLETED', 'DELIVERED') AND o.completedAt >= :startOfMonth")
    BigDecimal sumRevenueThisMonth(@Param("startOfMonth") LocalDateTime startOfMonth);
    
    // This year's completed/delivered revenue
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.status IN ('COMPLETED', 'DELIVERED') AND o.completedAt >= :startOfYear")
    BigDecimal sumRevenueThisYear(@Param("startOfYear") LocalDateTime startOfYear);
    
    // Daily revenue for last N days (7 or 30)
    @Query(value = "SELECT CAST(completed_at AS DATE) as period, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as order_count " +
                   "FROM orders WHERE status IN ('COMPLETED', 'DELIVERED') AND completed_at >= :startDate " +
                   "GROUP BY CAST(completed_at AS DATE) ORDER BY period ASC", nativeQuery = true)
    List<Object[]> sumRevenueByDay(@Param("startDate") LocalDateTime startDate);

    // Monthly revenue for last N months (12)
    @Query(value = "SELECT DATE_FORMAT(completed_at, '%Y-%m') as period, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as order_count " +
                   "FROM orders WHERE status IN ('COMPLETED', 'DELIVERED') AND completed_at >= :startDate " +
                   "GROUP BY DATE_FORMAT(completed_at, '%Y-%m') ORDER BY period ASC", nativeQuery = true)
    List<Object[]> sumRevenueByMonth(@Param("startDate") LocalDateTime startDate);

    // Yearly revenue for last N years (5)
    @Query(value = "SELECT YEAR(completed_at) as period, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as order_count " +
                   "FROM orders WHERE status IN ('COMPLETED', 'DELIVERED') AND completed_at >= :startDate " +
                   "GROUP BY YEAR(completed_at) ORDER BY period ASC", nativeQuery = true)
    List<Object[]> sumRevenueByYear(@Param("startDate") LocalDateTime startDate);

    // Best selling products (from completed/delivered orders)
    @Query(value = "SELECT oi.product_id as productId, oi.product_name as productName, " +
                   "SUM(oi.quantity) as totalSold, SUM(oi.line_total) as totalRevenue " +
                   "FROM order_items oi " +
                   "JOIN orders o ON oi.order_id = o.id " +
                   "WHERE o.status IN ('COMPLETED', 'DELIVERED') " +
                   "GROUP BY oi.product_id, oi.product_name " +
                   "ORDER BY totalSold DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> findBestSellingProducts(@Param("limit") int limit);
}
