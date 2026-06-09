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

/**
 * User tự hủy đơn hàng của mình (PENDING hoặc PENDING_CONFIRM)
 * @param {number} orderId - ID đơn hàng
 */
export const apiCancelOrder = async (orderId) => {
  const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Không thể hủy đơn hàng" }));
    throw new Error(err.message || "Không thể hủy đơn hàng");
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

// =====================================================
// BANKING PAYMENT API
// =====================================================

/**
 * Xác nhận thanh toán banking (sau khi đã chuyển khoản)
 * @param {number} orderId - ID đơn hàng
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
 * Lấy số đơn hàng chờ xác nhận thanh toán banking (Admin)
 */
export const apiGetPendingBankingCount = async () => {
  const response = await fetch(`${API_BASE}/v1/banking/pending-count`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Không thể lấy số đơn chờ" }));
    throw new Error(err.message || "Không thể lấy số đơn chờ");
  }

  return response.json();
};

// =====================================================
// VNPAY PAYMENT API
// =====================================================

/**
 * Tạo URL thanh toán VNPAY
 * @param {string} orderCode - Mã đơn hàng
 * @param {number} amount - Số tiền (VND)
 * @param {string} locale - Ngôn ngữ (vn/en)
 * @param {string} bankCode - Mã ngân hàng (tùy chọn)
 * @param {string} email - Email của khách (để verify guest order)
 * @returns {Promise<{paymentUrl: string, txnRef: string}>}
 */
export const apiCreateVNPayPayment = async (orderCode, amount, locale = "vn", bankCode = "", email = "") => {
  const response = await fetch(`${API_BASE}/v1/vnpay/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderCode, amount, locale, bankCode, email }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Không thể tạo thanh toán VNPAY" }));
    throw new Error(err.message || "Không thể tạo thanh toán VNPAY");
  }

  return response.json();
};

/**
 * Lấy thông tin kết quả thanh toán từ VNPAY return URL
 * @param {Object} params - Các tham số từ VNPAY return
 */
export const apiGetVNPayReturnResult = async (params) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/v1/vnpay/return?${queryString}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Không thể lấy kết quả thanh toán" }));
    throw new Error(err.message || "Không thể lấy kết quả thanh toán");
  }

  return response.json();
};
