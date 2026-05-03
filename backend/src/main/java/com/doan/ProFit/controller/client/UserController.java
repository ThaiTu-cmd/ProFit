package com.doan.ProFit.controller.client;

import com.doan.ProFit.dto.request.UserUpdateRequest;
import com.doan.ProFit.dto.response.UserResponse;
import com.doan.ProFit.entity.User;
import com.doan.ProFit.repository.UserRepository;
import com.doan.ProFit.security.jwt.JwtUtils;
import com.doan.ProFit.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        String token = jwtUtils.getJwtFromRequest(request);
        if (token == null || !jwtUtils.validateJwtToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Chưa đăng nhập"));
        }

        String email = jwtUtils.getUserNameFromJwtToken(token);
        User user = userRepository.findByEmailOrPhone(email, null)
                .orElse(null);

        if (user == null) {
            // Thử tìm bằng phone
            user = userRepository.findByEmailOrPhone(null, email)
                    .orElse(null);
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Không tìm thấy người dùng"));
        }

        UserResponse response = new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus()
        );

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateCurrentUser(
            HttpServletRequest request,
            @RequestBody UserUpdateRequest updateRequest) {
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

        // Chỉ cho phép cập nhật thông tin cá nhân, không cho đổi role/status
        user.setFullName(updateRequest.getFullName() != null ? updateRequest.getFullName().trim() : user.getFullName());
        user.setPhone(updateRequest.getPhone() != null ? updateRequest.getPhone().trim() : user.getPhone());

        User saved = userRepository.save(user);

        UserResponse response = new UserResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getPhone(),
                saved.getRole(),
                saved.getStatus()
        );

        return ResponseEntity.ok(response);
    }
}
