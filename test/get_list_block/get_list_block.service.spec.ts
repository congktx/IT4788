import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';

import { BlocksService } from '../../src/modules/blocks/blocks.service';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserBlock } from '../../src/modules/blocks/entities/user-block.entity';
import { UserFollow } from '../../src/modules/follow/entities/user-follow.entity';

import { runApiIntegrationTest } from './get_list_block_test';
import { mockUsers, mockTokens, mockBlockRelation } from '../mock-data';

describe('BlocksService - getListBlocks Unit Test', () => {
  let service: BlocksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksService,
        {
          provide: getRepositoryToken(UserBlock),
          useValue: {
            find: jest.fn().mockImplementation((query) => {
              const blockerId = String(query.where.blocker_id);
              const skip = query.skip ?? 0;
              const take = query.take ?? 10;

              const relations = mockBlockRelation
                .filter((item) => item.blocker_id === blockerId)
                .map((item, index) => ({
                  id: index + 1,
                  blocker_id: Number(item.blocker_id),
                  blocked_id: Number(item.blocked_id),
                }));

              return relations.slice(skip, skip + take);
            }),
          },
        },

        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn().mockImplementation((query) => {
              const ids = query.where.id._value;

              return ids
                .map((id: number) => {
                  const user = mockUsers[String(id)];
                  if (!user) return null;

                  return {
                    id: Number(user.id),
                    username: user.username,
                    fullname: null,
                    avatar: user.avatar,
                  };
                })
                .filter(Boolean);
            }),
          },
        },

        {
          provide: getRepositoryToken(UserFollow),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<BlocksService>(BlocksService);
  });

  const apiFunctionWrapper = async (input: any) => {
    const currentUserId = Number(mockTokens[input.token]);

    return await service.getListBlocks(currentUserId, {
      index: input.index,
      count: input.count,
    });
  };

  runApiIntegrationTest(apiFunctionWrapper as any, 'strict');
});
