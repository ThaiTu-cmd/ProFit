package com.doan.ProFit.security.dto;

public class AuthResponse {
    private final String token;
    private final String tokenType = "Bearer";
    private final String username;
    private final String role;

    public AuthResponse(String token, String username, String role) {
        this.token = token;
        this.username = username;
        this.role = role;
    }

    public String getToken() {
        return token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }
}
