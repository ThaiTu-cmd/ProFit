package com.doan.ProFit.security.oauth2;

import com.doan.ProFit.entity.User;
import com.doan.ProFit.enums.Role;
import com.doan.ProFit.enums.Status;
import com.doan.ProFit.repository.UserRepository;
import com.doan.ProFit.security.jwt.JwtUtils;
import com.doan.ProFit.security.service.UserDetailsImpl;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauth2User = oauthToken.getPrincipal();
        String provider = oauthToken.getAuthorizedClientRegistrationId();

        String email = oauth2User.getAttribute("email");
        String fullName = oauth2User.getAttribute("name");
        if (fullName == null || fullName.isBlank()) {
            fullName = email.split("@")[0];
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = new User();
            user.setFullName(fullName);
            user.setEmail(email);
            user.setPhone(null);
            user.setPasswordHash(UUID.randomUUID().toString());
            user.setRole(Role.CUSTOMER);
            user.setStatus(Status.ACTIVE);
            user.setEmailVerifiedAt(LocalDateTime.now());
            user = userRepository.save(user);
        }

        UserDetailsImpl userDetails = new UserDetailsImpl(user);
        String jwt = jwtUtils.generateJwtToken(userDetails, false);

        String role = user.getRole().name().replace("ROLE_", "");
        String redirectUrl = String.format(
            "http://localhost:5173/auth-callback?token=%s&username=%s&role=%s&fullName=%s&phone=%s",
            jwt,
            URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8),
            role,
            URLEncoder.encode(user.getFullName(), StandardCharsets.UTF_8),
            user.getPhone() != null ? user.getPhone() : ""
        );

        response.sendRedirect(redirectUrl);
    }
}
