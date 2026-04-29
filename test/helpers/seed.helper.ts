// File này dùng để tạo dữ liệu giả chạy E2E test
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserFollow } from '../../src/modules/follow/entities/user-follow.entity';
import { UserBlock } from '../../src/modules/blocks/entities/user-block.entity';
import { Conversation } from '../../src/modules/conversations/entities/conversation.entity';
import { Message } from '../../src/modules/conversations/entities/message.entity';
import { Notification } from '../../src/modules/notifications/entities/notification.entity';

export class SeedHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Hàm tổng hợp để nạp toàn bộ dữ liệu mẫu
   */
  async seedAll() {
    const users = await this.seedUsers(5);

    // User 1 follow User 2
    await this.seedFollow(users[0].id, users[1].id);

    // User 1 block User 5
    await this.seedBlock(users[0].id, users[4].id);

    // Tạo conversation giữa user1 và user2, có sẵn 1 tin nhắn
    const conv = await this.seedConversation([users[0].id, users[1].id]);
    await this.seedMessage(conv.id, users[0].id, 'Xin chào!', 'text');

    // Tạo sẵn 2 notification cho user1: 1 chưa đọc, 1 đã đọc
    await this.seedNotification(users[0].id, 'Thông báo chưa đọc', false);
    await this.seedNotification(users[0].id, 'Thông báo đã đọc', true);

    return users;
  }

  /**
   * Nạp dữ liệu vào bảng Users
   * Chỉ cần truyền các field nullable — password là NOT NULL nên bắt buộc
   */
  async seedUsers(count: number = 5): Promise<User[]> {
    const repo = this.dataSource.getRepository(User);
    const users: Partial<User>[] = [];

    for (let i = 1; i <= count; i++) {
      users.push({
        id: i,
        username: `user_${i}`,
        fullname: `Full Name ${i}`,
        password: 'hashed_password_123',
        phone_number: `090000000${i}`,
        role: 'user',
        uuid: `uuid-test-${i}`,
      });
    }

    return await repo.save(users);
  }

  /**
   * Tạo conversation giữa nhiều users
   * Tất cả column của Conversation đều nullable nên không cần truyền thêm
   */
  async seedConversation(userIds: number[]): Promise<Conversation> {
    const repo = this.dataSource.getRepository(Conversation);
    const users = userIds.map((id) => ({ id }));
    const now = Math.floor(Date.now() / 1000);

    const conversation = repo.create({
      users: users as User[],
      time_last_update: now,
      time_last_seen: 0,
    });

    return await repo.save(conversation);
  }

  /**
   * Tạo message trong conversation
   */
  async seedMessage(
    conversationId: number,
    senderId: number,
    content: string,
    type: string = 'text',
  ): Promise<Message> {
    const repo = this.dataSource.getRepository(Message);
    const convRepo = this.dataSource.getRepository(Conversation);
    const now = Math.floor(Date.now() / 1000);

    const message = repo.create({
      content,
      type,
      created_at: now,
      sender: { id: senderId } as User,
      conversation: { id: conversationId } as Conversation,
    });

    const saved = await repo.save(message);

    await convRepo.update(conversationId, {
      last_messasge_id: saved.id,
      time_last_update: now,
    });

    return saved;
  }

  /**
   * Tạo notification cho user
   *
   * Các field NOT NULL trong entity: type, product_id, title, avatar, group, read, created_at
   * Không có cột 'content' — field đúng là 'title'
   *
   * @param userId    - ID của user nhận notification
   * @param title     - Nội dung thông báo (map vào cột 'title')
   * @param read      - Đã đọc hay chưa
   * @param type      - Loại notification, ví dụ: 'new_post', 'new_order', 'system'
   * @param productId - ID sản phẩm liên quan (0 nếu không có)
   * @param group     - Nhóm notification (0 nếu không phân nhóm)
   * @param avatar    - URL avatar hiển thị kèm notification ('' nếu không có)
   */
  async seedNotification(
    userId: number,
    title: string = 'Test notification',
    read: boolean = false,
    type: string = 'system',
    productId: number = 0,
    group: number = 0,
    avatar: string = '',
  ): Promise<Notification> {
    const repo = this.dataSource.getRepository(Notification);
    const now = Math.floor(Date.now() / 1000);
    return await repo.save({
      user: { id: userId } as User,
      type,
      product_id: productId,
      title,
      avatar,
      group,
      read,
      created_at: now,
    });
  }

  /**
   * Nạp dữ liệu mẫu vào bảng Follow
   */
  async seedFollow(followerId: number, followeeId: number) {
    const repo = this.dataSource.getRepository(UserFollow);
    return await repo.save({
      follower_id: followerId,
      followee_id: followeeId,
    });
  }

  /**
   * Nạp dữ liệu mẫu vào bảng Block
   */
  async seedBlock(blockerId: number, blockedId: number) {
    const repo = this.dataSource.getRepository(UserBlock);
    return await repo.save({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
  }

  /**
   * Xóa sạch toàn bộ dữ liệu
   */
  async clearAll() {
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await this.dataSource.query('TRUNCATE TABLE notifications');
    await this.dataSource.query('TRUNCATE TABLE messages');
    await this.dataSource.query('TRUNCATE TABLE conversations_users_users');
    await this.dataSource.query('TRUNCATE TABLE user_conversations');
    await this.dataSource.query('TRUNCATE TABLE conversations');
    await this.dataSource.query('TRUNCATE TABLE user_follows');
    await this.dataSource.query('TRUNCATE TABLE user_blocks');
    await this.dataSource.query('TRUNCATE TABLE users');
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
