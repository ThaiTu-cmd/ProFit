// =====================================================
// utils/api.js – Các hàm gọi API tới Backend
// =====================================================

const API_BASE = "http://localhost:8080/ProFitSuppsDB/api";

// Lấy JWT token từ localStorage
const getToken = () => localStorage.getItem("token");

// Header mặc định có authentication
const getAuthHeaders = () => {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// =====================================================
// AUTH API
// =====================================================

export const apiLogin = async (username, password, rememberMe = false) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, rememberMe }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Đăng nhập thất bại" }));
    throw new Error(err.message || "Đăng nhập thất bại");
  }

  return response.json();
};

export const apiRegister = async (fullName, email, phone, password) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName, email, phone, password_hash: password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Đăng ký thất bại" }));
    throw new Error(err.message || "Đăng ký thất bại");
  }

  return response.json();
};

// =====================================================
// ORDER API
// =====================================================

/**
 * Tạo đơn hàng (yêu cầu đăng nhập)
 * @param {Object} orderData - Dữ liệu đơn hàng
 * @returns {Promise} - Response từ server
 */
export const apiCreateOrder = async (orderData) => {
  const response = await fetch(`${API_BASE}/orders/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Tạo đơn hàng thất bại" }));
    throw new Error(err.message || "Tạo đơn hàng thất bại");
  }

  return response.json();
};

/**
 * Tạo đơn hàng cho khách vãng lai (không cần đăng nhập)
 * @param {Object} orderData - Dữ liệu đơn hàng
 * @returns {Promise} - Response từ server
 */
export const apiCreateGuestOrder = async (orderData) => {
  const response = await fetch(`${API_BASE}/orders/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Tạo đơn hàng thất bại" }));
    throw new Error(err.message || "Tạo đơn hàng thất bại");
  }

  return response.json();
};

/**
 * Lấy danh sách đơn hàng của user hiện tại
 * @returns {Promise<Array>} - Mảng đơn hàng
 */
export const apiGetMyOrders = async () => {
  const response = await fetch(`${API_BASE}/orders/my-orders`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Không thể lấy danh sách đơn hàng" }));
    throw new Error(err.message || "Không thể lấy danh sách đơn hàng");
  }

  return response.json();
};

// =====================================================
// REVIEW API
// =====================================================

/**
 * Lấy reviews của một sản phẩm (public - không cần login)
 */
export const apiGetProductReviews = async (productId) => {
  const response = await fetch(`${API_BASE}/reviews/product/${productId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Không thể lấy đánh giá sản phẩm");
  }

  return response.json();
};

/**
 * Tạo review mới (yêu cầu đăng nhập)
 */
export const apiCreateReview = async ({ productId, rating, comment }) => {
  const response = await fetch(`${API_BASE}/reviews`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ productId, rating, comment }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Gửi đánh giá thất bại" }));
    throw new Error(err.message || "Gửi đánh giá thất bại");
  }

  return response.json();
};

// =====================================================
// PRODUCT API
// =====================================================

/**
 * Lấy danh sách sản phẩm (public)
 */
export const apiGetProducts = async () => {
  const response = await fetch(`${API_BASE}/products`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Không thể lấy danh sách sản phẩm");
  }

  return response.json();
};

/**
 * Lấy sản phẩm theo ID (public)
 */
export const apiGetProductById = async (id) => {
  const response = await fetch(`${API_BASE}/products/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Không thể lấy thông tin sản phẩm");
  }

  return response.json();
};

// =====================================================
// HELPER
// =====================================================

/**
 * Kiểm tra user đã đăng nhập chưa
 */
export const isLoggedIn = () => {
  return !!getToken();
};

/**
 * Kiểm tra user có phải admin không
 */
export const isAdmin = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return false;
  try {
    const user = JSON.parse(userStr);
    return user.role === "admin";
  } catch {
    return false;
  }
};
