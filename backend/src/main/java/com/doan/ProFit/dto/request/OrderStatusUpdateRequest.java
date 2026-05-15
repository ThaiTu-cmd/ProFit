package com.doan.ProFit.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;

public class OrderStatusUpdateRequest {
    @JsonProperty("order_status")
    private String status;

    @JsonProperty("payment_status")
    private String paymentStatus;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
}
