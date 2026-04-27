import { API_BASE_URL, getDefaultHeaders } from './apiConfig';

export const productService = {
    getAllProducts: async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/product/all`, {
                headers: getDefaultHeaders(),
            });
            if (!res.ok) throw new Error('Failed to fetch products');
            return await res.json();
        } catch (error) {
            console.error('Error in getAllProducts:', error);
            throw error;
        }
    },
};
