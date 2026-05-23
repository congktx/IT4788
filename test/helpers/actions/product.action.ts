import { api } from '../api-client.helper';

export const productAction = {
  addProduct: (token: string, body: object) =>
    api.post('/api/add_product', body, token),

  getProduct: (body: object) => api.post('/api/get_products', body),

  getListProducts: (body: object) => api.post('/api/get_list_products', body),
};
