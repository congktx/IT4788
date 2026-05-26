import { api } from '../api-client.helper';

export const rewardsAction = {
  getHistory: async (token: string, body: object) => {
    return await api.post('/rewards/get_reward_history', body, token);
  },

  getHistoryRaw: async (token: string | null, body: object) => {
    return await api.post('/rewards/get_reward_history', body, token);
  },

  createAppeal: async (token: string, body: object) => {
    return await api.post('/rewards/create_reward_appeal', body, token);
  },

  createAppealRaw: async (token: string | null, body: object) => {
    return await api.post('/rewards/create_reward_appeal', body, token);
  },
};
