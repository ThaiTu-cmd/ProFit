package com.doan.ProFit.controller.admin;

import com.doan.ProFit.dto.request.UserCreationRequest;
import com.doan.ProFit.dto.request.UserUpdateRequest;
import com.doan.ProFit.dto.response.UserResponse;
import com.doan.ProFit.exception.UserNotFoundException;
import com.doan.ProFit.security.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/admin")
public class AdminController {
    @Autowired
    private UserService userService;

    @GetMapping("/index")
    public String adminIndex() {
        return "admin/index";
    }

    @GetMapping("/order/list")
    public String orderList() {
        return "admin/order/list";
    }

    @GetMapping("/order/detail")
    public String orderDetail(@RequestParam("id") String id) {
        return "admin/order/detail";
    }

    @GetMapping("/product/list")
    public String productList() {
        return "admin/product/list";
    }

    @GetMapping("/product/category")
    public String productCategory() {
        return "admin/product/category";
    }

    @GetMapping("/product/add")
    public String productAdd() {
        return "admin/product/add";
    }

    @GetMapping("/user/list")
    public String userList() {
        return "admin/user/list";
    }

    @GetMapping("/marketing/discount")
    public String marketingDiscount() {
        return "admin/marketing/discount";
    }

    @GetMapping("/reviews/review")
    public String reviews() {
        return "admin/reviews/review";
    }

    @GetMapping("/user/all")
    @ResponseBody
    public List<UserResponse> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping("/user/add")
    @ResponseBody
    public UserResponse createUser(@RequestBody UserCreationRequest request) {
        return userService.createUser(request);
    }

    @PutMapping("/user/{id}")
    @ResponseBody
    public UserResponse updateUser(@PathVariable Long id, @RequestBody UserUpdateRequest request) {
        return userService.updateUser(id, request);
    }

    @DeleteMapping("/user/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public String handleBadRequest(IllegalArgumentException ex) {
        return ex.getMessage();
    }

    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    @ResponseBody
    public String handleNotFound(UserNotFoundException ex) {
        return ex.getMessage();
    }

}
