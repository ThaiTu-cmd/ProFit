package com.doan.ProFit.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class GuestOrderRequest {
    @JsonProperty("recipient_name")
    @NotBlank(message = "Recipient name is required")
    private String recipientName;

    @JsonProperty("recipient_phone")
    @NotBlank(message = "Phone is required")
    private String recipientPhone;

    @JsonProperty("shipping_address_line1")
    @NotBlank(message = "Address is required")
    private String shippingAddressLine1;

    @JsonProperty("shipping_city")
    @NotBlank(message = "City is required")
    private String shippingCity;

    @JsonProperty("shipping_province")
    private String shippingProvince;

    private String note;

    @JsonProperty("pay_method")
    private String payMethod;

    @NotEmpty(message = "Order must have at least one item")
    private List<OrderItemRequest> items;

    public GuestOrderRequest() {}

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
