package com.doan.ProFit.controller.client;

import com.doan.ProFit.dto.response.OrderResponse;
import com.doan.ProFit.entity.User;
import com.doan.ProFit.repository.UserRepository;
import com.doan.ProFit.security.jwt.JwtUtils;
import com.doan.ProFit.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @GetMapping("/my-orders")
    public ResponseEntity<?> getMyOrders(HttpServletRequest request) {
        String token = jwtUtils.getJwtFromRequest(request);
        if (token == null || !jwtUtils.validateJwtToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Chưa đăng nhập"));
        }

        String email = jwtUtils.getUserNameFromJwtToken(token);
        User user = userRepository.findByEmailOrPhone(email, null)
                .orElse(null);

        if (user == null) {
            user = userRepository.findByEmailOrPhone(null, email)
                    .orElse(null);
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Không tìm thấy người dùng"));
        }

        List<OrderResponse> orders = orderService.getOrdersByEmail(user.getEmail());
        return ResponseEntity.ok(orders);
    }
}
