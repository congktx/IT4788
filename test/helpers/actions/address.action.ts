import { api } from '../api-client.helper';

export const addressAction = {
  createAddress: async (token: string, body: object) => {
    return await api.post('/addresses/create', body, token);
  },

  createAddressRaw: async (token: string | null, body: object) => {
    return await api.post('/addresses/create', body, token);
  },

  getMyAddresses: async (token: string) => {
    return await api.get('/addresses/me', token);
  },

  getMyAddressesRaw: async (token: string | null) => {
    return await api.get('/addresses/me', token);
  },
};
