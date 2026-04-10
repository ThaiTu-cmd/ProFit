package com.doan.ProFit.config;

import com.doan.ProFit.entity.User;
import com.doan.ProFit.enums.Role;
import com.doan.ProFit.enums.Status;
import com.doan.ProFit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminDataInitializer {

    @Bean
    public CommandLineRunner seedDefaultAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin.enabled:true}") boolean adminBootstrapEnabled,
            @Value("${app.bootstrap.admin.full-name:Default Admin}") String fullName,
            @Value("${app.bootstrap.admin.email:admin@profit.com}") String email,
            @Value("${app.bootstrap.admin.phone:0900000000}") String phone,
            @Value("${app.bootstrap.admin.password:Admin@123}") String password) {
        return args -> {
            if (!adminBootstrapEnabled) {
                return;
            }

            User admin = userRepository.findByEmailOrPhone(email.trim(), phone.trim())
                    .orElseGet(User::new);

            admin.setFullName(fullName.trim());
            admin.setEmail(email.trim());
            admin.setPhone(phone.trim());
            admin.setRole(Role.ADMIN);
            admin.setStatus(Status.ACTIVE);
            admin.setDeletedAt(null);
            admin.setPasswordHash(passwordEncoder.encode(password));

            userRepository.save(admin);
            System.out.println("[ProFit] Default admin is ready: " + email);
        };
    }
}
