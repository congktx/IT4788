import { api } from '../api-client.helper';

export const orderAction = {
  addOrderAddress: async (token: string, body: object) => {
    return await api.post('/order/add_order_address', body, token);
  },

  addOrderAddressRaw: async (token: string | null, body: object) => {
    return await api.post('/order/add_order_address', body, token);
  },

  updateOrderAddress: async (
    token: string,
    id: number | string,
    body: object,
  ) => {
    return await api.patch(`/order/update/${id}`, body, token);
  },

  updateOrderAddressRaw: async (
    token: string | null,
    id: number | string,
    body: object,
  ) => {
    return await api.patch(`/order/update/${id}`, body, token);
  },

  deleteOrderAddress: async (token: string, id: number | string) => {
    return await api.delete(`/order/delete/${id}`, token);
  },

  deleteOrderAddressRaw: async (token: string | null, id: number | string) => {
    return await api.delete(`/order/delete/${id}`, token);
  },

  getListOrderAddress: async (token: string) => {
    return await api.get('/order/get_list_order_address', token);
  },

  getListOrderAddressRaw: async (token: string | null) => {
    return await api.get('/order/get_list_order_address', token);
  },

  getShipFrom: async (token: string, params: string) => {
    return await api.get(`/order/get_ship_from?${params}`, token);
  },

  getShipFromRaw: async (token: string | null, params: string) => {
    return await api.get(`/order/get_ship_from?${params}`, token);
  },

  getShipFee: async (token: string, body: object) => {
    return await api.post('/order/get_ship_fee', body, token);
  },

  getShipFeeRaw: async (token: string | null, body: object) => {
    return await api.post('/order/get_ship_fee', body, token);
  },

  createOrder: (token: string, body: object) =>
    api.post('/order/create_order', body, token),

  createOrderRaw: (token: string | null, body: object) =>
    api.post('/order/create_order', body, token),

  getListPurchases: (token: string, body: object) =>
    api.post('/order/get_list_purchases', body, token),

  getListPurchasesRaw: (token: string | null, body: object) =>
    api.post('/order/get_list_purchases', body, token),

  getPurchase: (token: string, body: object) =>
    api.post('/order/get_purchase', body, token),

  getPurchaseRaw: (token: string | null, body: object) =>
    api.post('/order/get_purchase', body, token),

  editPurchase: (token: string, body: object) =>
    api.post('/order/edit_purchase', body, token),

  editPurchaseRaw: (token: string | null, body: object) =>
    api.post('/order/edit_purchase', body, token),

  cancelOrder: (token: string, body: object) =>
    api.post('/order/cancel_order', body, token),

  cancelOrderRaw: (token: string | null, body: object) =>
    api.post('/order/cancel_order', body, token),

  setAcceptBuyer: (token: string, body: object) =>
    api.post('/order/set_accept_buyer', body, token),

  setAcceptBuyerRaw: (token: string | null, body: object) =>
    api.post('/order/set_accept_buyer', body, token),

  buyerConfirmReceived: (token: string, body: object) =>
    api.post('/order/buyer_confirm_received', body, token),

  buyerConfirmReceivedRaw: (token: string | null, body: object) =>
    api.post('/order/buyer_confirm_received', body, token),

  sellerMarkAsShipped: (token: string, body: object) =>
    api.post('/order/seller_mark_as_shipped', body, token),

  sellerMarkAsShippedRaw: (token: string | null, body: object) =>
    api.post('/order/seller_mark_as_shipped', body, token),

  refundOrder: (token: string, body: object) =>
    api.post('/order/refund_order', body, token),

  refundOrderRaw: (token: string | null, body: object) =>
    api.post('/order/refund_order', body, token),

  getCart: (token: string) => api.get('/order/get_cart', token),

  getCartRaw: (token: string | null) => api.get('/order/get_cart', token),

  addCart: (token: string, body: object) =>
    api.post('/order/add_cart', body, token),

  addCartRaw: (token: string | null, body: object) =>
    api.post('/order/add_cart', body, token),

  editCart: (token: string, body: object) =>
    api.post('/order/edit_cart', body, token),

  editCartRaw: (token: string | null, body: object) =>
    api.post('/order/edit_cart', body, token),

  deleteCart: (token: string, body: object) =>
    api.post('/order/delete_cart', body, token),

  deleteCartRaw: (token: string | null, body: object) =>
    api.post('/order/delete_cart', body, token),
};
