// File này dùng để tạo dữ liệu giả chạy code
import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserFollow } from '../../src/modules/follow/entities/user-follow.entity';
import { UserBlock } from '../../src/modules/blocks/entities/user-block.entity';

export class SeedHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Hàm tổng hợp để nạp toàn bộ dữ liệu mẫu
   */
  async seedAll() {
    const users = await this.seedUsers(5); // Tạo 5 users

    // Tạo sẵn 1 vài quan hệ mẫu để test
    // User 1 follow User 2
    await this.seedFollow(users[0].id, users[1].id);

    // User 1 block User 5
    await this.seedBlock(users[0].id, users[4].id);

    return users;
  }

  /**
   * Nạp dữ liệu vào bảng Users
   */
  async seedUsers(count: number = 5): Promise<User[]> {
    const repo = this.dataSource.getRepository(User);
    const users: Partial<User>[] = [];

    for (let i = 1; i <= count; i++) {
      users.push({
        id: i, // Ép ID để dễ kiểm soát trong E2E test
        username: `user_${i}`,
        fullname: `Full Name ${i}`,
        password: 'hashed_password_123',
        phone_number: `090000000${i}`,
        role: 'user',
        uuid: `uuid-test-${i}`,
      });
    }

    // Dùng save để TypeORM thực hiện logic insert/update
    return await repo.save(users);
  }

  /**
   * Nạp dữ liệu mẫu vào bảng Follow (Test trường hợp đã follow)
   */
  async seedFollow(followerId: number, followeeId: number) {
    const repo = this.dataSource.getRepository(UserFollow);
    return await repo.save({
      follower_id: followerId,
      followee_id: followeeId,
    });
  }

  /**
   * Nạp dữ liệu mẫu vào bảng Block (Test trường hợp đã block)
   */
  async seedBlock(blockerId: number, blockedId: number) {
    const repo = this.dataSource.getRepository(UserBlock);
    return await repo.save({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
  }

  /**
   * Hàm xóa sạch dữ liệu nếu cần reset giữa các test case
   */
  async clearAll() {
    // Tắt foreign key check trước khi xóa
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await this.dataSource.query('TRUNCATE TABLE user_follows');
    await this.dataSource.query('TRUNCATE TABLE user_blocks');
    await this.dataSource.query('TRUNCATE TABLE users');
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
