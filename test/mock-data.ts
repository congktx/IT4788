export interface MockUser {
  id: string;
  username: string;
}

// 1. Danh sách User đang tồn tại trong hệ thống (Dùng để check mã 1013)
export const mockUsers: Record<string, MockUser> = {
  u_001: { id: 'u_001', username: 'user1' },
  u_002: { id: 'u_002', username: 'user2' },
  u_003: { id: 'u_003', username: 'user3' },
};

// 2. Danh sách Token (Dùng để check mã 9998)
// Key là token, Value là ID của user sở hữu token đó
export const mockTokens: Record<string, string> = {
  token_live_001: 'u_001',
  token_live_002: 'u_002',
  token_expired: 'EXPIRED', // Giả lập một token đã hết hạn
};

// 3. Bảng quan hệ Follow (Dùng để check mã 1010 và tính Follow_count)
// Key là ID người đi follow, Value là mảng ID những người ĐANG được follow
export const mockFollowRelation: Record<string, string[]> = {
  u_001: ['u_002'], // User 1 đang follow User 2
  u_002: [], // User 2 chưa follow ai
  u_003: ['u_001', 'u_002'], // User 3 follow cả 1 và 2
};
