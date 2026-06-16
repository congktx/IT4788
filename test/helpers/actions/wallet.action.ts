import { api } from '../api-client.helper';

export const walletAction = {
  getCurrentBalance: (token: string, body: object = {}) =>
    api.post('/wallets/get_current_balance', body, token),

  getCurrentBalanceRaw: (token: string | null, body: object = {}) =>
    api.post('/wallets/get_current_balance', body, token),

  getBalanceHistory: (token: string, body: object) =>
    api.post('/wallets/get_balance_history', body, token),

  getBalanceHistoryRaw: (token: string | null, body: object) =>
    api.post('/wallets/get_balance_history', body, token),
};
