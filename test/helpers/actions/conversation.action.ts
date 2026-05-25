import { api } from '../api-client.helper';

export const conversationAction = {
  getConversation: (token: string, body: object) =>
    api.post('/conversation/get_conversation', body, token),

  getConversationRaw: (token: string | null, body: object) =>
    api.post('/conversation/get_conversation', body, token),

  getListConversation: (token: string, body: object) =>
    api.post('/conversation/get_list_conversation', body, token),

  getListConversationRaw: (token: string | null, body: object) =>
    api.post('/conversation/get_list_conversation', body, token),

  setReadMessage: (token: string, body: object) =>
    api.post('/conversation/set_read_message', body, token),

  setReadMessageRaw: (token: string | null, body: object) =>
    api.post('/conversation/set_read_message', body, token),

  sendMessage: (token: string, body: object) =>
    api.post('/conversation/send_message', body, token),
};
