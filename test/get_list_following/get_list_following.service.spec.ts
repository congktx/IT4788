//get_list_following.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowService } from '../../src/modules/follow/follow.service';
import { UserFollow } from '../../src/modules/follow/entities/user-follow.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserBlock } from '../../src/modules/blocks/entities/user-block.entity';

import { runApiIntegrationTest } from './get_list_following_test';

import {
  mockUsers,
  mockFollowRelation,
  mockTokens,
  mockBlockRelation,
} from '../mock-data';

describe('FollowService - getListFollowing Unit Test', () => {
  let service: FollowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        {
          provide: getRepositoryToken(UserFollow),
          useValue: {
            find: jest.fn().mockImplementation((query) => {
              // CASE 1
              // Lấy danh sách user mà user_id đang follow
              if (
                query.where?.follower_id &&
                !query.where?.followee_id?._type
              ) {
                const userId = String(query.where.follower_id);

                const followingList = mockFollowRelation[userId] || [];

                const results = followingList.map((followeeId) => ({
                  id: Math.floor(Math.random() * 10000),
                  follower_id: Number(userId),
                  followee_id: Number(followeeId),
                }));

                return results
                  .sort((a, b) => b.id - a.id)
                  .slice(
                    query.skip || 0,
                    (query.skip || 0) + (query.take || 10),
                  );
              }

              // CASE 2
              // Check current user có follow ai trong list không
              if (
                query.where?.follower_id &&
                query.where?.followee_id?._type === 'in'
              ) {
                const currentUserId = String(query.where.follower_id);

                const targetIds = query.where.followee_id._value.map(String);

                const myFollowing = mockFollowRelation[currentUserId] || [];

                return targetIds
                  .filter((id) => myFollowing.map(String).includes(id))
                  .map((id) => ({
                    id: Math.floor(Math.random() * 10000),
                    follower_id: Number(currentUserId),
                    followee_id: Number(id),
                  }));
              }

              return [];
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockImplementation((query) => {
              const id = String(query.where.id);
              return mockUsers[id] || null;
            }),

            find: jest.fn().mockImplementation((query) => {
              if (query.where?.id?._type === 'in') {
                const ids = query.where.id._value.map(String);

                return ids
                  .map((id) => mockUsers[id])
                  .filter(Boolean)
                  .map((user) => ({
                    id: Number(user.id),
                    username: user.username,
                    avatar: user.avatar,
                  }));
              }

              return [];
            }),
          },
        },
        {
          provide: getRepositoryToken(UserBlock),
          useValue: {
            findOne: jest.fn().mockImplementation((query) => {
              if (!query.where || !Array.isArray(query.where)) return null;

              return (
                mockBlockRelation.find((block) =>
                  query.where.some(
                    (cond: any) =>
                      String(cond.blocker_id) === String(block.blocker_id) &&
                      String(cond.blocked_id) === String(block.blocked_id),
                  ),
                ) || null
              );
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FollowService>(FollowService);
  });
  const apiFunctionWrapper = async (input: any) => {
    const userIdStr = mockTokens[input.token];

    const currentUserId = userIdStr === 'EXPIRED' ? -1 : Number(userIdStr) || 0;

    return await service.getListFollowing(currentUserId, {
      user_id: input.user_id,
      index: input.index,
      count: input.count,
    });
  };

  runApiIntegrationTest(apiFunctionWrapper as any, 'full');
});
