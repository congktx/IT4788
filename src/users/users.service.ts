import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async onApplicationBootstrap() {
    console.log('[Database Init] Đang kiểm tra dữ liệu khởi tạo...');
    const count = await this.usersRepository.count();

    if (count === 0) {
      const defaultUser = this.usersRepository.create({
        username: 'admin',
        email: 'admin@example.com',
        hash_password: 'admin_password_placeholder',
      });
      await this.usersRepository.save(defaultUser);

      console.log('[Database Init] Đã khởi tạo người dùng mặc định (admin)!');
    } else {
      console.log(`[Database Init] Đã có ${count} bản ghi trong bảng users, bỏ qua khởi tạo.`);
    }
  }
}
