export interface MockUser {
  id: string;
  username: string;
  avatar: string;
}

export const mockUsers: Record<string, MockUser> = {
  '1': { id: '1', username: 'user1', avatar: 'https://cdn/a1.png' },
  '2': { id: '2', username: 'user2', avatar: 'https://cdn/a2.png' },
  '3': { id: '3', username: 'user3', avatar: 'https://cdn/a3.png' },
  '4': { id: '4', username: 'user4', avatar: 'https://cdn/a4.png' },
  '5': { id: '5', username: 'user5', avatar: 'https://cdn/a5.png' },
  '10': { id: '10', username: 'user10', avatar: 'https://cdn/a10.png' },
};

export const mockTokens: Record<string, string> = {
  token_live_001: '1',
  token_live_002: '2',
  token_expired: 'EXPIRED', // Token không hợp lệ
};

// export const mockFollowRelation: Record<string, string[]> = {
//   '1': ['2', '3'], // User 1 follow 2 và 3
//   '2': ['3', '4', '5'],
//   '3': ['1', '2'], // User 3 follow 1 (User 1 có follower là 3)
//   '4': ['1'], // User 4 follow 1 (User 1 có follower là 4)
//   '5': ['1'], // User 5 follow 1 (User 1 có follower là 5)
//   '10': [], // User 10 không follow ai và không ai follow (Check mảng rỗng)
// };

export const mockFollowRelation: Record<string, string[]> = {
  '1': ['3'],
  '2': ['3', '4', '5'],
  '3': ['2'],
  '4': ['1'],
  '5': ['1'],
  '10': [],
};

export const mockBlockRelation: Array<{
  blocker_id: string;
  blocked_id: string;
}> = [
  { blocker_id: '1', blocked_id: '2' }, // đã block
  { blocker_id: '3', blocked_id: '1' }, // block ngược
];
