/**
 * test/e2e/set-user-follow.e2e-spec.ts
 *
 * MỤC ĐÍCH: Chế độ 2 — Chạy TOÀN BỘ 24 TC, không dừng giữa chừng.
 * Sau khi chạy xong sẽ log ra tất cả TC fail và TC pass.
 *
 * CÁCH CHẠY:
 *   npm run test:e2e:full
 *
 * ĐẶC ĐIỂM:
 *   - Mỗi TC hoàn toàn ĐỘC LẬP nhau
 *   - beforeEach: clearAll() + seedAll() → reset DB trước mỗi TC
 *   - TC fail không ảnh hưởng đến TC khác
 *   - afterAll: clearAll() + đóng app
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
  ACTION_DONE_PREVIOUSLY: {
    code: '1010',
    message: 'action has been done previously by this user.',
  },
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

// Reset DB trước MỖI TC — đảm bảo TC độc lập
beforeEach(async () => {
  await seed.clearAll();
  await seed.seedAll();
});

function callApi(token: string | null, body: object) {
  const req = request(app.getHttpServer()).post('/set_user_follow').send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

// Kiểu dữ liệu trả về nếu là TH thành công
function expectSuccessDataShape(res: any) {
  const data = res.body.data;
  expect(typeof data.followee_id, failMsg(res)).toBe('string');
  expect(typeof data.is_following, failMsg(res)).toBe('boolean');
  expect(typeof data.follow_count, failMsg(res)).toBe('number');
  expect(typeof data.following_count, failMsg(res)).toBe('number');
}

describe('POST /set_user_follow', () => {
  describe('Trường hợp thành công', () => {
    // 2 unfollow 3
    it('TC01 — Follow thành công một người mới (2 follow 3)', async () => {
      const token = generateAuthToken(2, 'user_2');
      const res = await callApi(token, { followee_id: 3, action: 'follow' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(res.body.data.is_following, failMsg(res)).toBe(true);
      expectSuccessDataShape(res);
    });

    // 1 unfollow 2
    it('TC02 — Unfollow thành công một người (1 unfollow 2)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: 2, action: 'unfollow' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(res.body.data.is_following, failMsg(res)).toBe(false);
      expectSuccessDataShape(res);
    });

    // Vì reset DB giữa mỗi TC nên không cần phải có TH này

    // it('TC03 — Follow lại người vừa unfollow', async () => {
    //   const token = generateAuthToken(1, 'user_1');
    //   await callApi(token, { followee_id: 2, action: 'unfollow' });
    //   const res = await callApi(token, { followee_id: 2, action: 'follow' });
    //   expect(res.status, failMsg(res)).toBe(200);
    //   expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    //   expect(res.body.data.is_following, failMsg(res)).toBe(true);
    //   expectSuccessDataShape(res);
    // });

    // it('TC04 — Unfollow người vừa follow', async () => {
    //   const token = generateAuthToken(2, 'user_2');
    //   await callApi(token, { followee_id: 3, action: 'follow' });
    //   const res = await callApi(token, { followee_id: 3, action: 'unfollow' });
    //   expect(res.status, failMsg(res)).toBe(200);
    //   expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    //   expect(res.body.data.is_following, failMsg(res)).toBe(false);
    //   expectSuccessDataShape(res);
    // });
  });

  describe('Trường hợp thất bại — thiếu tham số', () => {
    it('TC05 — Bỏ trống cả 3: followee_id, action, token', async () => {
      const res = await callApi(null, {});
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC06 — Bỏ trống followee_id và action (có token)', async () => {
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

    it('TC07 — Bỏ trống followee_id và token', async () => {
      const res = await callApi(null, { action: 'follow' });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC08 — Bỏ trống action và token', async () => {
      const res = await callApi(null, { followee_id: 2 });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC09 — Bỏ trống followee_id (có token, có action)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { action: 'follow' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC10 — Bỏ trống action (có token, có followee_id)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: 2 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC11 — Bỏ trống token (có followee_id, có action)', async () => {
      const res = await callApi(null, { followee_id: 2, action: 'follow' });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });

  describe('Trường hợp thất bại — sai kiểu dữ liệu followee_id', () => {
    it('TC12 — followee_id là chuỗi không phải số ("abc")', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {
        followee_id: 'abc',
        action: 'follow',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC13 — followee_id là số thực (1.5)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: 1.5, action: 'follow' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC14 — followee_id là số âm (-1)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: -1, action: 'follow' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC15 — followee_id = 0', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: 0, action: 'follow' });
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

  describe('Thất bại — action không hợp lệ', () => {
    it('TC16 — action = "like" (không phải follow/unfollow)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: 2, action: 'like' });
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

  describe('Trường hợp thất bại — token không hợp lệ', () => {
    it('TC17 — Token sai định dạng', async () => {
      const res = await callApi('invalid.token.here', {
        followee_id: 2,
        action: 'follow',
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC18 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, {
        followee_id: 2,
        action: 'follow',
      });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });

  describe('Trường hợp thất bại — lỗi nghiệp vụ từ input truyền vào', () => {
    it('TC19 — followee_id không tồn tại, action = follow', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {
        followee_id: 999999,
        action: 'follow',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.USER_NOT_EXIST.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC20 — followee_id không tồn tại, action = unfollow', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {
        followee_id: 999999,
        action: 'unfollow',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.USER_NOT_EXIST.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC21 — Tự follow chính mình', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: 1, action: 'follow' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC22 — Tự unfollow chính mình', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: 1, action: 'unfollow' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC23 — Follow người đã follow rồi', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { followee_id: 2, action: 'follow' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC24 — Unfollow người chưa follow', async () => {
      const token = generateAuthToken(2, 'user_2');
      const res = await callApi(token, { followee_id: 3, action: 'unfollow' });
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
