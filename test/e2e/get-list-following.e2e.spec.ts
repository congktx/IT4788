/**
 * FILE: test/e2e/get-list-following.e2e.spec.ts
 *
 * MỤC ĐÍCH: Chế độ 2 — Chạy TOÀN BỘ TC, không dừng giữa chừng.
 * Test API POST /get_list_following
 *
 * CÁCH CHẠY:
 *   npm run test:e2e:full
 *
 * API: POST /get_list_following
 * INPUT: { user_id, index, count }
 * OUTPUT: danh sách người user_id đang follow
 *   - id: string
 *   - username: string
 *   - image: string (avatar)
 *   - followed: giá trị = 1 nếu cả User_id và token đều đang cùng theo dõi người này, nếu không cùng thi = 0
 *
 * ĐẶC ĐIỂM:
 *   - Nếu currentUser block user_id hoặc ngược lại → NOT_ACCESS
 *   - Mỗi TC độc lập — beforeEach reset DB
 *   - Một số TC tạo thêm data riêng bằng seed.seedFollow()
 */

import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app';
import { SeedHelper } from '../helpers/seed.helper';
import { generateAuthToken } from '../helpers/auth.helper';

const RESPONSE = {
  OK: { code: '1000', message: 'OK' },
  PARAMETER_NOT_ENOUGH: { code: '1002', message: 'Parameter is not enough.' },
  PARAMETER_TYPE_INVALID: {
    code: '1003',
    message: 'Parameter type is invalid.',
  },
  PARAMETER_VALUE_INVALID: {
    code: '1004',
    message: 'Parameter value is invalid.',
  },
  NOT_ACCESS: { code: '1009', message: 'Not access.' },
  USER_NOT_EXIST: { code: '1013', message: 'User does not exist.' },
};

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

beforeEach(async () => {
  await seed.clearAll();
  await seed.seedAll();
  // seedAll tạo: 5 users, user1 follow user2, user1 block user5
});

function callApi(token: string | null, body: object) {
  const req = request(app.getHttpServer())
    .post('/get_list_following')
    .send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

// Kiểm tra kiểu dữ liệu của 1 item trong data
function expectItemShape(item: any) {
  expect(typeof item.id).toBe('string');
  expect(typeof item.username).toBe('string');
  expect(item.followed === 0 || item.followed === 1).toBe(true);
}

describe('POST /get_list_following', () => {
  // ── THÀNH CÔNG ────────────────────────────

  describe('Trường hợp thành công', () => {
    it('TC01 — Lấy danh sách người mà user1 đang follow', async () => {
      // seedAll: user1 follow user2
      // get_list_following(user_id=1) → [user2]

      const token = generateAuthToken(3, 'user_3');

      const res = await callApi(token, {
        user_id: 1,
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
      expect(res.body.data.length, failMsg(res)).toBe(1);

      const item = res.body.data[0];

      expect(item.id, failMsg(res)).toBe('2');
      expect(item.username, failMsg(res)).toBe('user_2');

      expectItemShape(item);
    });

    it('TC02 — Danh sách rỗng khi user chưa follow ai', async () => {
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        user_id: 3,
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data, failMsg(res)).toEqual([]);
    });

    it('TC03 — followed=1 khi currentUser cũng đang follow người đó', async () => {
      await seed.seedFollow(1, 3);
      // user1 follow user2, user3

      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        user_id: 1,
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const user3Item = res.body.data.find((item: any) => item.id === '3');

      expect(user3Item, failMsg(res)).toBeDefined();
      expect(user3Item.followed, failMsg(res)).toBe(1);
    });

    it('TC04 — followed=0 khi currentUser không follow người đó', async () => {
      const token = generateAuthToken(3, 'user_3');

      const res = await callApi(token, {
        user_id: 1,
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const user2Item = res.body.data.find((item: any) => item.id === '2');

      expect(user2Item.followed, failMsg(res)).toBe(0);
    });

    it('TC05 — Phân trang: index=0, count=1 chỉ trả 1 item', async () => {
      await seed.seedFollow(1, 3);
      await seed.seedFollow(1, 4);
      // user1 follow user2, user3, user4

      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        user_id: 1,
        index: 0,
        count: 1,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data.length, failMsg(res)).toBe(1);
    });

    it('TC06 — Phân trang: index=1 bỏ qua item đầu tiên', async () => {
      await seed.seedFollow(1, 3);
      await seed.seedFollow(1, 4);
      // user1 follow 3 người

      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        user_id: 1,
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data.length, failMsg(res)).toBe(2);
    });

    it('TC07 — Xem danh sách mình đang follow', async () => {
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        user_id: 1,
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  // ── THẤT BẠI — THIẾU THAM SỐ ─────────────

  describe('Thất bại — thiếu tham số', () => {
    it('TC08 — Bỏ trống cả 4: user_id, index, count, token', async () => {
      const res = await callApi(null, {});
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC09 — Bỏ trống user_id, index, count (có token)', async () => {
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

    it('TC10 — Bỏ trống index và count (có token, có user_id)', async () => {
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

    it('TC11 — Bỏ trống user_id (có token, index, count)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { index: 0, count: 10 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC12 — Bỏ trống index (có token, user_id, count)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, count: 10 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC13 — Bỏ trống count (có token, user_id, index)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, index: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC14 — Bỏ trống token', async () => {
      const res = await callApi(null, { user_id: 2, index: 0, count: 10 });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });

  // ── THẤT BẠI — SAI KIỂU DỮ LIỆU ──────────

  describe('Thất bại — sai kiểu dữ liệu', () => {
    it('TC15 — user_id là chuỗi không phải số ("abc")', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 'abc', index: 0, count: 10 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC16 — index là chuỗi không phải số ("abc")', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, index: 'abc', count: 10 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC17 — count là chuỗi không phải số ("abc")', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, index: 0, count: 'abc' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC18 — user_id là số âm (-1)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: -1, index: 0, count: 10 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC19 — index âm (-1)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, index: -1, count: 10 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC20 — count = 0', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { user_id: 2, index: 0, count: 0 });
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

  // ── THẤT BẠI — TOKEN ──────────────────────

  describe('Thất bại — token không hợp lệ', () => {
    it('TC21 — Token sai định dạng', async () => {
      const res = await callApi('invalid.token.here', {
        user_id: 2,
        index: 0,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC22 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, {
        user_id: 2,
        index: 0,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });

  // ── THẤT BẠI — NGHIỆP VỤ ─────────────────

  describe('Thất bại — nghiệp vụ', () => {
    it('TC23 — user_id không tồn tại', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {
        user_id: 999999,
        index: 0,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.USER_NOT_EXIST.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC24 — currentUser đã block user_id → NOT_ACCESS', async () => {
      // seedAll: user1 block user5
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {
        user_id: 5,
        index: 0,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.message);
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC25 — user_id đã block currentUser → NOT_ACCESS', async () => {
      // user5 bị block bởi user1 trong seedAll
      // Tạo thêm: user2 block user1
      await seed.seedBlock(2, 1);

      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {
        user_id: 2,
        index: 0,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.message);
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });
});
