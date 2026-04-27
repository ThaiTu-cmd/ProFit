package com.doan.ProFit.controller.client;

import com.doan.ProFit.dto.request.GuestCheckoutRequest;
import com.doan.ProFit.dto.response.GuestCheckoutResponse;
import com.doan.ProFit.dto.response.GuestOrderLookupResponse;
import com.doan.ProFit.service.GuestOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/guest")
@CrossOrigin(origins = "*")
public class GuestOrderController {

    @Autowired
    private GuestOrderService guestOrderService;

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@RequestBody GuestCheckoutRequest request) {
        try {
            GuestCheckoutResponse response = guestOrderService.createGuestOrder(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/orders/lookup")
    public ResponseEntity<?> lookupOrder(
            @RequestParam String orderCode,
            @RequestParam String phone) {
        try {
            GuestOrderLookupResponse response = guestOrderService.lookupOrderByCodeAndPhone(orderCode, phone);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/orders/phone/{phone}")
    public ResponseEntity<List<GuestOrderLookupResponse>> getOrdersByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(guestOrderService.lookupOrdersByPhone(phone));
    }

    @PostMapping("/coupon/validate")
    public ResponseEntity<?> validateCoupon(@RequestBody Map<String, String> body) {
        try {
            String code = body.get("code");
            GuestCheckoutResponse response = guestOrderService.applyCoupon(code);
            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "code", code.toUpperCase(),
                    "discountType", response.getStatus(),
                    "discountValue", response.getSubtotal()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "error", e.getMessage()));
        }
    }
}
