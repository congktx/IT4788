export interface SetUserFollowInput {
  token: string;
  followee_id: string;
  action: 'follow' | 'unfollow';
}

export interface SetUserFollowOutput {
  code: string;
  message: string;
  data?: {
    followee_id: string;
    is_following: boolean;
    follow_count: number;
    following_count: number;
  };
}
