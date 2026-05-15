package com.doan.ProFit.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class OrderRequest {
    @JsonProperty("recipient_name")
    private String recipientName;

    @JsonProperty("recipient_phone")
    private String recipientPhone;

    @JsonProperty("shipping_address_line1")
    private String shippingAddressLine1;

    @JsonProperty("shipping_city")
    private String shippingCity;

    @JsonProperty("shipping_province")
    private String shippingProvince;

    private String note;

    @JsonProperty("pay_method")
    private String payMethod;

    @NotEmpty(message = "Order must have at least one item")
    private List<OrderItemRequest> items;

    // Getters and Setters
    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }
    public String getRecipientPhone() { return recipientPhone; }
    public void setRecipientPhone(String recipientPhone) { this.recipientPhone = recipientPhone; }
    public String getShippingAddressLine1() { return shippingAddressLine1; }
    public void setShippingAddressLine1(String shippingAddressLine1) { this.shippingAddressLine1 = shippingAddressLine1; }
    public String getShippingCity() { return shippingCity; }
    public void setShippingCity(String shippingCity) { this.shippingCity = shippingCity; }
    public String getShippingProvince() { return shippingProvince; }
    public void setShippingProvince(String shippingProvince) { this.shippingProvince = shippingProvince; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getPayMethod() { return payMethod; }
    public void setPayMethod(String payMethod) { this.payMethod = payMethod; }
    public List<OrderItemRequest> getItems() { return items; }
    public void setItems(List<OrderItemRequest> items) { this.items = items; }
}
