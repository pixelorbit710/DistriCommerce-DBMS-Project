const BASE_URL = '/api';

export async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP error! Status: ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  getHealth: () => request('/health'),
  getRoutingOverview: () => request('/routing/overview'),
  resolveCity: (city) => request(`/routing/resolve?city=${encodeURIComponent(city)}`),
  getDashboardStats: () => request('/dashboard/stats'),
  getCustomers: () => request('/customers'),
  getOrders: (params = {}) => {
    const query = new URLSearchParams();
    if (params.region && params.region !== 'All') query.append('region', params.region);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    const qs = query.toString();
    return request(`/orders${qs ? '?' + qs : ''}`);
  },
  createOrder: (orderData) => request('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),
  updateOrderStatus: (orderId, region, status) => request(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ region, status })
  }),
  deleteOrder: (orderId, region) => request(`/orders/${orderId}?region=${encodeURIComponent(region)}`, {
    method: 'DELETE'
  }),
  getRegionalOrders: (region) => request(`/regional/${region}/orders`),
  getGlobalQueryInfo: () => request('/regional/global-query'),
  simulatePartitioning: (payload) => request('/partitioning/simulate', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getProducts: () => request('/products'),
  updateProduct: (data) => request('/products/update', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  syncProducts: (data = {}) => request('/products/sync', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getParallelSales: () => request('/parallel-query/sales'),
  execute2PC: (payload) => request('/2pc/execute', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  get2PCTransactions: (limit = 20) => request(`/2pc/transactions?limit=${limit}`),
  recoverParticipant: (payload) => request('/recovery/recover', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getRecoveryLogs: (limit = 25) => request(`/recovery/logs?limit=${limit}`),
};
