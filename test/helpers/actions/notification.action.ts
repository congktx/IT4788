import { api } from '../api-client.helper';

export const notificationAction = {
  getNotification: async (token: string, body: object) => {
    return await api.post('/notification/get_notification', body, token);
  },

  getNotificationRaw: async (token: string | null, body: object) => {
    return await api.post('/notification/get_notification', body, token);
  },

  setReadNotification: async (token: string, body: object) => {
    return await api.post('/notification/set_read_notification', body, token);
  },

  setReadNotificationRaw: async (token: string | null, body: object) => {
    return await api.post('/notification/set_read_notification', body, token);
  },
};
