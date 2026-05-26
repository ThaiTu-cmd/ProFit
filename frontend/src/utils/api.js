// =====================================================
// utils/api.js – Các hàm gọi API tới Backend
// =====================================================

const API_BASE = "/api";

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
// PAYMENT API
// =====================================================

/**
 * Tạo payment URL VNPay cho một đơn hàng
 * @param {number} orderId - ID của đơn hàng vừa tạo
 * @returns {Promise<{paymentUrl: string}>} - URL thanh toán VNPay
 */
export const apiCreatePayment = async (orderId) => {
  const response = await fetch(`${API_BASE}/v1/payment/create/${orderId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Không thể tạo thanh toán VNPay" }));
    throw new Error(err.message || "Không thể tạo thanh toán VNPay");
  }

  return response.json();
};

/**
 * Xác nhận đã chuyển khoản ngân hàng (user gửi yêu cầu xác nhận)
 * @param {number} orderId - ID của đơn hàng
 * @returns {Promise} - Response từ server
 */
export const apiConfirmBankingPayment = async (orderId) => {
  const response = await fetch(`${API_BASE}/v1/banking/confirm/${orderId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Xác nhận thanh toán thất bại" }));
    throw new Error(err.message || "Xác nhận thanh toán thất bại");
  }

  return response.json();
};

/**
 * Lấy số lượng đơn chờ xác nhận thanh toán (cho admin)
 * @returns {Promise<{count: number}>} - Số lượng đơn chờ xác nhận
 */
export const apiGetPendingConfirmCount = async () => {
  const response = await fetch(`${API_BASE}/v1/banking/pending-count`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Không thể lấy số đơn chờ xác nhận" }));
    throw new Error(err.message || "Không thể lấy số đơn chờ xác nhận");
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
export const apiCreateReview = async ({ productId, rating, comment, phone }) => {
  const token = localStorage.getItem("token");
  console.log("Token for review:", token ? "exists" : "missing");
  
  const response = await fetch(`${API_BASE}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` }),
    },
    body: JSON.stringify({ productId, rating, comment, phone }),
  });

  console.log("Review response status:", response.status);
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
// MESSAGE API (Contact)
// =====================================================

/**
 * Gửi tin nhắn liên hệ (yêu cầu đăng nhập)
 */
export const apiSendMessage = async ({ subject, content }) => {
  const response = await fetch(`${API_BASE}/messages/send`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ subject, content }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Gửi tin nhắn thất bại" }));
    throw new Error(err.message || "Gửi tin nhắn thất bại");
  }
  return response.json();
};

/**
 * Lấy tin nhắn của user hiện tại (để xem phản hồi)
 */
export const apiGetMyMessages = async () => {
  const response = await fetch(`${API_BASE}/messages/my`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Không thể lấy tin nhắn");
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

// =====================================================
// FORGOT PASSWORD API
// =====================================================

export const apiForgotPassword = async (email) => {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Gửi yêu cầu thất bại");
  }
  return data;
};

export const apiResetPassword = async (token, newPassword) => {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Đặt lại mật khẩu thất bại");
  }
  return data;
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
