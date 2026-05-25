package com.doan.ProFit.security;

import com.doan.ProFit.security.jwt.AuthTokenFilter;
import com.doan.ProFit.security.oauth2.OAuth2AuthenticationSuccessHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
	private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    private final AuthTokenFilter authTokenFilter;
    private final OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler;

    public SecurityConfig(AuthTokenFilter authTokenFilter, OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler) {
        this.authTokenFilter = authTokenFilter;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public AuthenticationEntryPoint unauthorizedEntryPoint() {
        return new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                logger.warn("Unauthorized access attempt to: {} {} - Reason: {}", 
                    request.getMethod(), request.getRequestURI(), authException.getMessage());
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Vui lòng đăng nhập\"}");
            }))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                    // OAuth2 endpoints
                    .requestMatchers("/oauth2/authorization/**", "/login/oauth2/code/**").permitAll()
                    // Auth
                    .requestMatchers("/api/auth/**").permitAll()
                    // Public
                    .requestMatchers("/api/public/**").permitAll()
                    // Products & Categories (public)
                    .requestMatchers("/api/v1/products/**", "/api/v1/categories/**").permitAll()
                    // Reviews
                    .requestMatchers("/api/reviews/product/**").permitAll()
                    .requestMatchers("/api/reviews/**").authenticated()
                    // Orders
                    .requestMatchers("/api/orders/**").permitAll()
                    // Payment
                    .requestMatchers("/api/v1/payment/**").permitAll()
                    // Banking Payment
                    .requestMatchers("/api/v1/banking/**").authenticated()
                    // Messages
                    .requestMatchers("/api/messages/my", "/api/messages/send").authenticated()
                    .requestMatchers("/api/messages/admin/**", "/api/admin/**").hasRole("ADMIN")
                    // Admin legacy path
                    .requestMatchers("/admin/**").hasRole("ADMIN")
                    // Admin page templates
                    .requestMatchers("/admin/auth/**").permitAll()
                    .anyRequest().authenticated())
            .oauth2Login(oauth2 -> oauth2
                    .authorizationEndpoint(authorization -> authorization.baseUri("/oauth2/authorization/google"))
                    .redirectionEndpoint(redirection -> redirection.baseUri("/login/oauth2/code/*"))
                    .successHandler(oAuth2SuccessHandler)
            )
            .addFilterBefore(authTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
