import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { GetUserInfoDto } from './dto/get-user-info.dto';
import { APP_RESPONSE } from '../constants/response.constants';
import { Order } from '../orders/entities/order.entity';
import { UserFollow } from '../follow/entities/user-follow.entity';
import { UserBlock } from '../blocks/entities/user-block.entity';
import { SetUserInfoDto } from './dto/set-user-info.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,

    @InjectRepository(UserFollow)
    private readonly followsRepo: Repository<UserFollow>,

    @InjectRepository(UserBlock)
    private readonly blocksRepo: Repository<UserBlock>,
  ) { }

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

  async updateInfoAfterSignup(
    userId: number,
    payload: {
      username: string;
      avatar?: string;
    },
  ) {
    await this.usersRepository.update(userId, {
      username: payload.username,
      avatar: payload.avatar,
    });
  }

  async getUserInfo(currentUserId: number, body: GetUserInfoDto) {
    console.log(body)
    let user_id = body.user_id ? body.user_id : currentUserId;
    console.log(user_id)
    let user = await this.usersRepository.findOne({
      where: {
        id: user_id
      },
      relations: ["addresses"]
    });
    if (!user) {
      return {
        ...APP_RESPONSE.USER_NOT_EXIST,
        data: null
      }
    }
    let order_count = await this.ordersRepo.count({
      where: { seller: { id: user_id } }
    });
    let check_follow = 0
    let check_block = 0
    if (user_id && currentUserId) {
      check_follow = await this.followsRepo.count({
        where: {
          follower: { id: currentUserId },
          followee: { id: user_id }
        }
      });
      check_block = await this.blocksRepo.count({
        where: {
          blocked: { id: user_id },
          blocker: { id: currentUserId }
        }
      });
    }
    let info: any = {};
    if (body.user_id == currentUserId) {
      info["email"] = user.email;
      info["phonenumber"] = user.phone_number;
      info["firstname"] = user.firstname;
      info["lastname"] = user.lastname;
      info["address"] = user.address;
      info["city"] = user.city;
    }
    info["id"] = user.id;
    info["username"] = user.username;
    info["listing"] = order_count;
    info["status"] = user.status;
    info["avatar"] = user.avatar;
    info["cover_image"] = user.cover_image;
    info["cover_image_web"] = user.cover_image_web;
    info["followed"] = check_follow > 0;
    info["is_blocked"] = check_block > 0;
    info["online"] = 1;
    if (user.addresses.length > 0)
      info["default_address"] = {
        address_id: user.addresses[0].id,
        address: user.addresses[0].address_detail,
        pick_support: true
      }

    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data: info
    }
  }

  async setUserInfo(currentUserId: number, body: SetUserInfoDto) {
    if (body)
      await this.usersRepository.update(
        { id: currentUserId },
        body
      );

    return {
      ...APP_RESPONSE.OK,
      data: null
    }
  }
}
