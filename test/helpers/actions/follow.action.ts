import { api } from '../api-client.helper';

export const followAction = {
  follow: (token: string, userId: string) =>
    api.post(
      '/set_user_follow',
      { followee_id: userId, action: 'follow' },
      token,
    ),

  unfollow: (token: string, userId: string) =>
    api.post(
      '/set_user_follow',
      { followee_id: userId, action: 'unfollow' },
      token,
    ),

  raw: (token: string | null, body: object) =>
    api.post('/set_user_follow', body, token),

  getListFollowing: (token: string, body: object) =>
    api.post('/get_list_following', body, token),

  getListFollowingRaw: (token: string | null, body: object) =>
    api.post('/get_list_following', body, token),

  getListFollowed: (token: string, body: object) =>
    api.post('/get_list_followed', body, token),

  getListFollowedRaw: (token: string | null, body: object) =>
    api.post('/get_list_followed', body, token),

  isFollowing: async (
    followerToken: string,
    followerUserId: string,
    targetUserId: string,
  ): Promise<boolean> => {
    const res = await api.post(
      '/get_list_following',
      { user_id: followerUserId, index: 0, count: 50 },
      followerToken,
    );
    if (res.body.code !== '1000') return false;
    return res.body.data.some((u: any) => u.id === targetUserId);
  },

  isFollowed: async (
    targetToken: string,
    targetUserId: string,
    followerUserId: string,
  ): Promise<boolean> => {
    const res = await api.post(
      '/get_list_followed',
      { user_id: targetUserId, index: 0, count: 50 },
      targetToken,
    );
    if (res.body.code !== '1000') return false;
    return res.body.data.some((u: any) => u.id === followerUserId);
  },
};
