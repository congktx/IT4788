/**
 * FILE: test/e2e/blocks.e2e.spec.ts
 *
 * MỤC ĐÍCH: Chế độ 2 — Chạy TOÀN BỘ TC, không dừng giữa chừng.
 * Test API POST /set_user_block với 2 chức năng: block (type=0) và unblock (type=1)
 *
 * CÁCH CHẠY:
 *   npm run test:e2e:full
 *
 * ĐẶC ĐIỂM:
 *   - Mỗi TC hoàn toàn ĐỘC LẬP — beforeEach reset DB trước mỗi TC
 *   - Khi block thành công: kiểm tra follow 2 chiều bị xóa trong DB
 *   - TC fail không ảnh hưởng đến TC khác
 *
 * ĐIỂM KHÁC SO VỚI FOLLOW:
 *   - Tham số: user_id + type (number: 0/1) thay vì followee_id + action (string)
 *   - Response data = null kể cả khi thành công
 *   - Block → tự động xóa follow 2 chiều
 */

import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app';
import { SeedHelper } from '../helpers/seed.helper';
import { generateAuthToken } from '../helpers/auth.helper';
import { UserFollow } from '../../src/modules/follow/entities/user-follow.entity';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const RESPONSE = {
  OK: { code: '1000', message: 'OK' },
  PARAMETER_NOT_ENOUGH: { code: '1002', message: 'Parameter is not enought.' },
  PARAMETER_TYPE_INVALID: {
    code: '1003',
    message: 'Parameter type is invalid.',
  },
  PARAMETER_VALUE_INVALID: {
    code: '1004',
    message: 'Parameter value is invalid.',
  },
  ACTION_DONE_PREVIOUSLY: {
    code: '1010',
    message: 'action has been done previously by this user.',
  },
  USER_NOT_EXIST: { code: '1013', message: 'User does not exist' },
};

// ─────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────

let app: INestApplication;
let testingModule: TestingModule;
let dataSource: DataSource;
let seed: SeedHelper;

beforeAll(async () => {
  ({ app, module: testingModule } = await createTestApp());
  dataSource = testingModule.get(DataSource);
  seed = new SeedHelper(dataSource);
});

afterAll(async () => {
  await seed.clearAll();
  await app.close();
});

// Reset DB trước mỗi TC — đảm bảo TC độc lập
beforeEach(async () => {
  await seed.clearAll();
  await seed.seedAll();
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function callApi(token: string | null, body: object) {
  const req = request(app.getHttpServer()).post('/set_user_block').send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

// Kiểm tra follow 2 chiều đã bị xóa sau khi block
async function expectFollowDeleted(followerId: number, followeeId: number) {
  const follow = await dataSource.getRepository(UserFollow).findOne({
    where: { follower_id: followerId, followee_id: followeeId },
  });
  expect(follow).toBeNull();
}

// ─────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────

describe('POST /set_user_block', () => {
  // ── THÀNH CÔNG ────────────────────────────

  describe('Trường hợp thành công', () => {
    it('TC01 — Block một người (type=0), data trả về null', async () => {
      // user2 block user3 — chưa có quan hệ block nào
      const token = generateAuthToken(2, 'user_2');
      const res = await callApi(token, { user_id: 3, type: 0 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      // Block luôn trả data = null kể cả thành công
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC02 — Block xóa follow 2 chiều: A follow B + B follow A → block → cả 2 bị xóa', async () => {
      // seedAll đã tạo: user1 follow user2
      // Tạo thêm: user2 follow user1 (chiều ngược lại)
      await dataSource.getRepository(UserFollow).save({
        follower_id: 2,
        followee_id: 1,
      });

      // user1 block user2 → phải xóa cả 2 chiều follow
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, type: 0 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      // Kiểm tra DB — cả 2 chiều follow đã bị xóa
      await expectFollowDeleted(1, 2); // user1 follow user2 → bị xóa
      await expectFollowDeleted(2, 1); // user2 follow user1 → bị xóa
    });

    it('TC03 — Unblock một người (type=1)', async () => {
      // seedAll đã tạo: user1 block user5
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 5, type: 1 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  // ── THẤT BẠI — THIẾU THAM SỐ ─────────────

  describe('Thất bại — thiếu tham số', () => {
    it('TC04 — Bỏ trống cả 3: user_id, type, token', async () => {
      const res = await callApi(null, {});
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC05 — Bỏ trống user_id và type (có token)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {});
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC06 — Bỏ trống user_id và token', async () => {
      const res = await callApi(null, { type: 0 });
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC07 — Bỏ trống type và token', async () => {
      const res = await callApi(null, { user_id: 2 });
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC08 — Bỏ trống user_id (có token, có type)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC09 — Bỏ trống type (có token, có user_id)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC10 — Bỏ trống token (có user_id, có type)', async () => {
      const res = await callApi(null, { user_id: 2, type: 0 });
      expect(res.status, failMsg(res)).toBe(401);
    });
  });

  // ── THẤT BẠI — SAI KIỂU DỮ LIỆU ──────────

  describe('Thất bại — sai kiểu dữ liệu user_id', () => {
    it('TC11 — user_id là chuỗi không phải số ("abc")', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 'abc', type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC12 — user_id là số thực (1.5)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 1.5, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC13 — user_id là số âm (-1)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: -1, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC14 — user_id = 0', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 0, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  // ── THẤT BẠI — SAI TYPE ───────────────────

  describe('Thất bại — type không hợp lệ', () => {
    it('TC15 — type = 2 (không phải 0 hoặc 1)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, type: 2 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC16 — type là string ("block" thay vì số)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, type: 'block' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  // ── THẤT BẠI — TOKEN ──────────────────────

  describe('Thất bại — token không hợp lệ', () => {
    it('TC17 — Token sai định dạng', async () => {
      const res = await callApi('invalid.token.here', { user_id: 2, type: 0 });
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC18 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, { user_id: 2, type: 0 });
      expect(res.status, failMsg(res)).toBe(401);
    });
  });

  // ── THẤT BẠI — NGHIỆP VỤ ─────────────────

  describe('Thất bại — nghiệp vụ', () => {
    it('TC19 — user_id không tồn tại, type = 0 (block)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 999999, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.USER_NOT_EXIST.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC20 — user_id không tồn tại, type = 1 (unblock)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 999999, type: 1 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.USER_NOT_EXIST.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC21 — Tự block chính mình', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 1, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC22 — Tự unblock chính mình', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 1, type: 1 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC23 — Block người đã block rồi', async () => {
      // seedAll đã tạo: user1 block user5
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 5, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC24 — Unblock người chưa block', async () => {
      // user2 chưa block user3
      const token = generateAuthToken(2, 'user_2');
      const res = await callApi(token, { user_id: 3, type: 1 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });
});
