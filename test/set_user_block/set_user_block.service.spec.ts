import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BlocksService } from '../../src/modules/blocks/blocks.service';
import { UserFollow } from '../../src/modules/follow/entities/user-follow.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserBlock } from '../../src/modules/blocks/entities/user-block.entity';
import { runApiIntegrationTest } from './set_user_block_test';
import { mockUsers, mockBlockRelation, mockTokens } from '../mock-data';

describe('BlockService - Unit Test với Logic của Dev', () => {
  let service: BlocksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksService,

        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockImplementation((query) => {
              const id = String(query.where.id);
              return mockUsers[id] || null;
            }),
          },
        },

        {
          provide: getRepositoryToken(UserBlock),
          useValue: {
            findOne: jest.fn().mockImplementation((query) => {
              const { blocker_id, blocked_id } = query.where;

              return (
                mockBlockRelation.find(
                  (b) =>
                    String(b.blocker_id) === String(blocker_id) &&
                    String(b.blocked_id) === String(blocked_id),
                ) || null
              );
            }),

            create: jest.fn().mockImplementation((dto) => ({
              id: Math.floor(Math.random() * 1000),
              ...dto,
            })),

            save: jest.fn(),

            delete: jest.fn(),
          },
        },

        {
          provide: getRepositoryToken(UserFollow),
          useValue: {
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlocksService>(BlocksService);
  });

  const apiFunctionWrapper = async (input: any) => {
    const currentUserId = Number(mockTokens[input.token]);

    return await service.setUserBlock(currentUserId, {
      user_id: input.user_id,
      type: input.type,
    });
  };

  runApiIntegrationTest(apiFunctionWrapper as any, 'strict');
});
