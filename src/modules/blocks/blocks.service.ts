import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { APP_RESPONSE } from '../../common/constants/response.constants';
import { ApiResponse } from '../../common/interfaces/api-response.interface';
import { User } from '../users/entities/user.entity';
import { UserFollow } from '../follow/entities/user-follow.entity';
import { SetUserBlockDto } from './dto/set-user-block.dto';
import { UserBlock } from './entities/user-block.entity';
import { GetListBlocksDto } from './dto/get-list-blocks.dto';

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(UserBlock)
    private readonly userBlockRepository: Repository<UserBlock>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UserFollow)
    private readonly userFollowRepository: Repository<UserFollow>,
  ) {}

  async setUserBlock(
    currentUserId: number,
    dto: SetUserBlockDto,
  ): Promise<ApiResponse<null>> {
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      return this.fail(
        APP_RESPONSE.TOKEN_INVALID.code,
        APP_RESPONSE.TOKEN_INVALID.message,
      );
    }

    if (
      dto.user_id === undefined ||
      dto.user_id === null ||
      dto.type === undefined ||
      dto.type === null
    ) {
      return this.fail(
        APP_RESPONSE.PARAMETER_NOT_ENOUGH.code,
        APP_RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
    }

    const userId = Number(dto.user_id);
    const type = Number(dto.type);

    if (Number.isNaN(userId) || Number.isNaN(type)) {
      return this.fail(
        APP_RESPONSE.PARAMETER_TYPE_INVALID.code,
        APP_RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
    }

    if (!Number.isInteger(userId) || !Number.isInteger(type)) {
      return this.fail(
        APP_RESPONSE.PARAMETER_TYPE_INVALID.code,
        APP_RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
    }

    if (userId <= 0 || ![0, 1].includes(type)) {
      return this.fail(
        APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        APP_RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
    }

    if (userId === currentUserId) {
      return this.fail(
        APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        APP_RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
    }

    try {
      const targetUser = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id'],
      });

      if (!targetUser) {
        return this.fail(
          APP_RESPONSE.USER_NOT_EXIST.code,
          APP_RESPONSE.USER_NOT_EXIST.message,
        );
      }

      const existingBlock = await this.userBlockRepository.findOne({
        where: {
          blocker_id: currentUserId,
          blocked_id: userId,
        },
      });

      if (type === 0) {
        if (existingBlock) {
          return this.fail(
            APP_RESPONSE.ACTION_DONE_PREVIOUSLY.code,
            APP_RESPONSE.ACTION_DONE_PREVIOUSLY.message,
          );
        }

        const newBlock = this.userBlockRepository.create({
          blocker_id: currentUserId,
          blocked_id: userId,
        });

        await this.userBlockRepository.save(newBlock);

        await this.userFollowRepository.delete({
          follower_id: currentUserId,
          followee_id: userId,
        });

        await this.userFollowRepository.delete({
          follower_id: userId,
          followee_id: currentUserId,
        });

        return {
          code: APP_RESPONSE.OK.code,
          message: APP_RESPONSE.OK.message,
          data: null,
        };
      }

      if (type === 1) {
        if (!existingBlock) {
          return this.fail(
            APP_RESPONSE.ACTION_DONE_PREVIOUSLY.code,
            APP_RESPONSE.ACTION_DONE_PREVIOUSLY.message,
          );
        }

        await this.userBlockRepository.delete(existingBlock.id);

        return {
          code: APP_RESPONSE.OK.code,
          message: APP_RESPONSE.OK.message,
          data: null,
        };
      }

      return this.fail(
        APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        APP_RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return this.fail(
          APP_RESPONSE.ACTION_DONE_PREVIOUSLY.code,
          APP_RESPONSE.ACTION_DONE_PREVIOUSLY.message,
        );
      }

      return this.fail(
        APP_RESPONSE.EXCEPTION_ERROR.code,
        APP_RESPONSE.EXCEPTION_ERROR.message,
      );
    }
  }

  async getListBlocks(
    currentUserId: number,
    dto: GetListBlocksDto,
  ): Promise<ApiResponse<any[] | null>> {
    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      return this.fail(
        APP_RESPONSE.TOKEN_INVALID.code,
        APP_RESPONSE.TOKEN_INVALID.message,
      );
    }

    if (
      dto.index === undefined ||
      dto.index === null ||
      dto.count === undefined ||
      dto.count === null
    ) {
      return this.fail(
        APP_RESPONSE.PARAMETER_NOT_ENOUGH.code,
        APP_RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
    }

    const index = Number(dto.index);
    const count = Number(dto.count);

    if (Number.isNaN(index) || Number.isNaN(count)) {
      return this.fail(
        APP_RESPONSE.PARAMETER_TYPE_INVALID.code,
        APP_RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
    }

    if (!Number.isInteger(index) || !Number.isInteger(count)) {
      return this.fail(
        APP_RESPONSE.PARAMETER_TYPE_INVALID.code,
        APP_RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
    }

    if (index < 0 || count <= 0) {
      return this.fail(
        APP_RESPONSE.PARAMETER_VALUE_INVALID.code,
        APP_RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
    }

    try {
      const blockRelations = await this.userBlockRepository.find({
        where: { blocker_id: currentUserId },
        order: { id: 'DESC' },
        skip: index,
        take: count,
      });

      if (blockRelations.length === 0) {
        return this.okList([]);
      }

      const blockedUserIds = blockRelations.map((item) => item.blocked_id);

      const blockedUsers = await this.userRepository.find({
        where: { id: In(blockedUserIds) },
        select: ['id', 'username', 'fullname', 'avatar'],
      });

      const userMap = new Map(blockedUsers.map((user) => [user.id, user]));

      const data = blockRelations
        .map((relation) => {
          const user = userMap.get(relation.blocked_id);
          if (!user) return null;

          return {
            id: String(user.id),
            name: user.fullname || user.username,
            image: user.avatar,
          };
        })
        .filter(Boolean);

      return this.okList(data as any[]);
    } catch (error) {
      return this.fail(
        APP_RESPONSE.EXCEPTION_ERROR.code,
        APP_RESPONSE.EXCEPTION_ERROR.message,
      );
    }
  }

  private fail(code: string, message: string): ApiResponse<null> {
    return {
      code,
      message,
      data: null,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    const driverCode = (error as any)?.driverError?.code;
    return (
      error instanceof QueryFailedError &&
      (driverCode === 'ER_DUP_ENTRY' || driverCode === '23505')
    );
  }

  private okList(data: any[]): ApiResponse<any[]> {
    return {
      code: APP_RESPONSE.OK.code,
      message: APP_RESPONSE.OK.message,
      data,
    };
  }
}
