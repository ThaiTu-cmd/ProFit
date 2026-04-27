package com.doan.ProFit.config;

import com.doan.ProFit.entity.Category;
import com.doan.ProFit.entity.DiscountCode;
import com.doan.ProFit.entity.User;
import com.doan.ProFit.enums.Role;
import com.doan.ProFit.enums.Status;
import com.doan.ProFit.repository.CategoryRepository;
import com.doan.ProFit.repository.DiscountCodeRepository;
import com.doan.ProFit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Configuration
public class AdminDataInitializer {

    @Bean
    public CommandLineRunner seedDefaultAdmin(
            UserRepository userRepository,
            CategoryRepository categoryRepository,
            DiscountCodeRepository discountCodeRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin.enabled:true}") boolean adminBootstrapEnabled,
            @Value("${app.bootstrap.admin.full-name:Default Admin}") String fullName,
            @Value("${app.bootstrap.admin.email:admin@profit.com}") String email,
            @Value("${app.bootstrap.admin.phone:0900000000}") String phone,
            @Value("${app.bootstrap.admin.password:Admin@123}") String password) {
        return args -> {
            if (adminBootstrapEnabled) {
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
            }

            // Seed categories
            seedCategory(categoryRepository, "whey-protein", "Whey Protein");
            seedCategory(categoryRepository, "creatine", "Creatine");
            seedCategory(categoryRepository, "pre-workout", "Pre-Workout");
            seedCategory(categoryRepository, "vitamin-bcaa", "Vitamin & BCAA");

            if (discountCodeRepository.findByCodeAndDeletedAtIsNull("POWERFUEL30").isEmpty()) {
                DiscountCode d1 = new DiscountCode();
                d1.setCode("POWERFUEL30");
                d1.setDescription("Giam 30% cho don hang");
                d1.setDiscountType(DiscountCode.DiscountType.PERCENTAGE);
                d1.setDiscountValue(new BigDecimal("30"));
                d1.setMinOrderAmount(new BigDecimal("200000"));
                d1.setMaxDiscountAmount(new BigDecimal("150000"));
                d1.setUsageLimit(100);
                d1.setStartDate(LocalDateTime.now().minusDays(1));
                d1.setEndDate(LocalDateTime.now().plusMonths(1));
                d1.setActive(true);
                discountCodeRepository.save(d1);
            }

            if (discountCodeRepository.findByCodeAndDeletedAtIsNull("SALE10").isEmpty()) {
                DiscountCode d2 = new DiscountCode();
                d2.setCode("SALE10");
                d2.setDescription("Giam 10% cho don hang");
                d2.setDiscountType(DiscountCode.DiscountType.PERCENTAGE);
                d2.setDiscountValue(new BigDecimal("10"));
                d2.setMinOrderAmount(new BigDecimal("100000"));
                d2.setMaxDiscountAmount(new BigDecimal("50000"));
                d2.setUsageLimit(200);
                d2.setStartDate(LocalDateTime.now().minusDays(1));
                d2.setEndDate(LocalDateTime.now().plusMonths(3));
                d2.setActive(true);
                discountCodeRepository.save(d2);
            }

            if (discountCodeRepository.findByCodeAndDeletedAtIsNull("FREESHIP").isEmpty()) {
                DiscountCode d3 = new DiscountCode();
                d3.setCode("FREESHIP");
                d3.setDescription("Giam 30000 VND phi ship");
                d3.setDiscountType(DiscountCode.DiscountType.AMOUNT);
                d3.setDiscountValue(new BigDecimal("30000"));
                d3.setMinOrderAmount(new BigDecimal("100000"));
                d3.setUsageLimit(500);
                d3.setStartDate(LocalDateTime.now().minusDays(1));
                d3.setEndDate(LocalDateTime.now().plusMonths(2));
                d3.setActive(true);
                discountCodeRepository.save(d3);
            }

            if (discountCodeRepository.findByCodeAndDeletedAtIsNull("WELCOME50").isEmpty()) {
                DiscountCode d4 = new DiscountCode();
                d4.setCode("WELCOME50");
                d4.setDescription("Giam 50000 VND cho khach hang moi");
                d4.setDiscountType(DiscountCode.DiscountType.AMOUNT);
                d4.setDiscountValue(new BigDecimal("50000"));
                d4.setMinOrderAmount(new BigDecimal("300000"));
                d4.setUsageLimit(50);
                d4.setStartDate(LocalDateTime.now().minusDays(1));
                d4.setEndDate(LocalDateTime.now().plusDays(30));
                d4.setActive(true);
                discountCodeRepository.save(d4);
            }
        };
    }

    private void seedCategory(CategoryRepository categoryRepository, String slug, String name) {
        if (categoryRepository.findBySlug(slug).isEmpty()) {
            Category cat = new Category();
            cat.setSlug(slug);
            cat.setName(name);
            cat.setActive(true);
            categoryRepository.save(cat);
            System.out.println("[ProFit] Category seeded: " + name);
        }
    }
}
