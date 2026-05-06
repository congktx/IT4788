// API set_user_follow
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

// API get_list_followed
export interface GetListFollowedInput {
  user_id: string;
  token: string;
  index: string;
  count: string;
}

export interface FollowerItem {
  id: string;
  username: string;
  image: string;
  followed: 0 | 1;
}

export interface GetListFollowedOutput {
  code: string;
  message: string;
  data: FollowerItem[] | null;
}

// API get_list_followed
export interface GetListFollowingInput {
  user_id: string;
  token: string;
  index: string;
  count: string;
}

export interface GetListFollowingOutput {
  code: string;
  message: string;
  data: FollowerItem[] | null;
}

// API set_user_block
export interface SetUserBlockInput {
  token: string;
  user_id: string;
  type: '0' | '1';
}

export interface SetUserBlockOutput {
  code: string;
  message: string;
  data: null;
}

// API get_list_blocks
export interface GetListBlocksInput {
  token: string;
  index: string;
  count: string;
}

export interface BlockItem {
  id: string;
  name: string;
  image: string;
}

export interface GetListBlocksOutput {
  code: string;
  message: string;
  data: BlockItem[] | null;
}
