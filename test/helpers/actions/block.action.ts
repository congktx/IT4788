import { api } from '../api-client.helper';

export const blockAction = {
  block: (token: string, userId: string | number) =>
    api.post('/set_user_block', { user_id: userId, type: 0 }, token),

  unblock: (token: string, userId: string | number) =>
    api.post('/set_user_block', { user_id: userId, type: 1 }, token),

  raw: (token: string | null, body: object) =>
    api.post('/set_user_block', body, token),

  getListBlocks: (token: string, body: object) =>
    api.post('/get_list_blocks', body, token),

  getListBlocksRaw: (token: string | null, body: object) =>
    api.post('/get_list_blocks', body, token),
};
