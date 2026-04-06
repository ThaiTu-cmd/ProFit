package com.doan.ProFit.security.dto;

public class AdminAuthResponse {
    private final String token;
    private final String tokenType = "Bearer";
    private final String username;

    public AdminAuthResponse(String token, String username) {
        this.token = token;
        this.username = username;
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
}
