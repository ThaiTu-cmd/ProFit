package com.doan.ProFit.service;

import com.doan.ProFit.dto.request.GuestCheckoutRequest;
import com.doan.ProFit.dto.response.GuestCheckoutResponse;
import com.doan.ProFit.dto.response.GuestOrderLookupResponse;
import java.util.List;

public interface GuestOrderService {
    GuestCheckoutResponse createGuestOrder(GuestCheckoutRequest request);
    GuestOrderLookupResponse lookupOrderByCodeAndPhone(String orderCode, String phone);
    List<GuestOrderLookupResponse> lookupOrdersByPhone(String phone);
    GuestCheckoutResponse applyCoupon(String code);
}
