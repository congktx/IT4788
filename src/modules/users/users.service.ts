import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(payload: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(payload);
    return this.usersRepository.save(user);
  }

  async findByPhone(phone_number: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { phone_number },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async findByPhoneWithPassword(phone_number: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.phone_number = :phone_number', { phone_number })
      .getOne();
  }

  async findByIdWithPassword(id: number) {
    return this.usersRepository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'password',
        'role',
        'avatar',
        'fullname',
      ],
    });
  }

  async updatePassword(id: number, password: string): Promise<void> {
    await this.usersRepository.update(id, { password });
  }
}