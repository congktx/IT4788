import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowService } from '../../src/modules/follow/follow.service';
import { UserFollow } from '../../src/modules/follow/entities/user-follow.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserBlock } from '../../src/modules/blocks/entities/user-block.entity';
import { runApiIntegrationTest } from './set_user_follow_test';
import { mockUsers, mockFollowRelation, mockTokens } from '../mock-data';

describe('FollowService - Unit Test với Logic của Dev', () => {
  let service: FollowService;

  beforeEach(async () => {
    // TẠO MÔI TRƯỜNG GIẢ LẬP NESTJS
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        {
          provide: getRepositoryToken(UserFollow),
          useValue: {
            findOne: jest.fn().mockImplementation((query) => {
              const { follower_id, followee_id } = query.where;
              const relation = mockFollowRelation[String(follower_id)];
              if (relation?.includes(String(followee_id))) {
                return { id: 999, follower_id, followee_id }; // Giả lập có tồn tại
              }
              return null;
            }),
            count: jest.fn().mockImplementation((query) => {
              const { followee_id, follower_id } = query.where;

              // Trường hợp 1: Đếm số người đang follow User X (Followers)
              if (followee_id) {
                const targetId = String(followee_id);
                // Duyệt qua toàn bộ mockFollowRelation, xem ai có targetId trong mảng follow
                return Object.values(mockFollowRelation).filter(
                  (followedList) => followedList.map(String).includes(targetId),
                ).length;
              }

              // Trường hợp 2: Đếm số người mà User X đang follow (Following)
              if (follower_id) {
                const targetId = String(follower_id);
                return mockFollowRelation[targetId]?.length || 0;
              }

              return 0;
            }),
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
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
          useValue: { findOne: jest.fn().mockReturnValue(null) }, // Giả lập không ai chặn ai
        },
      ],
    }).compile();

    service = module.get<FollowService>(FollowService);
  });

  const apiFunctionWrapper = async (input: any) => {
    const currentUserId = Number(mockTokens[input.token]);
    return await service.setUserFollow(currentUserId, {
      followee_id: input.followee_id,
      action: input.action,
    });
  };

  runApiIntegrationTest(apiFunctionWrapper as any, 'full');
});
