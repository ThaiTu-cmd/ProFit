// Cấu hình Base URL cho Backend (Spring Boot mặc định thường chạy ở port 8080)
export const API_BASE_URL = '/ProFitSuppsDB';

// Các cấu hình chung cho fetch
export const getDefaultHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};
