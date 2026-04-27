/**
 * FILE: test/e2e/get-list-blocks.e2e.spec.ts
 *
 * MỤC ĐÍCH: Chế độ 2 — Chạy TOÀN BỘ TC, không dừng giữa chừng.
 * Test API POST /get_list_blocks
 *
 * API: POST /get_list_blocks
 * INPUT: { index, count }
 * OUTPUT: danh sách user mà currentUser đã block
 *   - id: string
 *   - username: string
 *   - avatar: string
 *
 * ĐẶC ĐIỂM:
 *   - Mỗi TC độc lập — beforeEach reset DB
 *   - Một số TC tạo thêm data bằng seed.seedBlock()
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
  PARAMETER_NOT_ENOUGH: { code: '1002', message: 'Parameter is not enought.' },
  PARAMETER_TYPE_INVALID: {
    code: '1003',
    message: 'Parameter type is invalid.',
  },
  PARAMETER_VALUE_INVALID: {
    code: '1004',
    message: 'Parameter value is invalid.',
  },
  USER_NOT_EXIST: { code: '1013', message: 'User does not exist' },
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
  // seedAll: tạo 5 users
  // ví dụ: user1 block user5
});

function callApi(token: string | null, body: object) {
  const req = request(app.getHttpServer()).post('/get_list_blocks').send(body);

  if (token) req.set('Authorization', `Bearer ${token}`);

  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

function expectItemShape(item: any) {
  expect(typeof item.id).toBe('string');
  expect(typeof item.name).toBe('string');
}

/**
 * ======================================================
 * TEST SUITE
 * ======================================================
 */

describe('POST /get_list_blocks', () => {
  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */

  describe('Trường hợp thành công', () => {
    it('TC01 — Lấy danh sách user đã block', async () => {
      // seedAll: user1 block user5

      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);

      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
      expect(res.body.data.length, failMsg(res)).toBe(1);

      const item = res.body.data[0];

      expect(item.id, failMsg(res)).toBe('5');
      expect(item.name, failMsg(res)).toBe('Full Name 5');

      expectItemShape(item);
    });

    it('TC02 — Danh sách rỗng khi user chưa block ai', async () => {
      const token = generateAuthToken(3, 'user_3');

      const res = await callApi(token, {
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data, failMsg(res)).toEqual([]);
    });

    it('TC03 — Phân trang: index=0 count=1', async () => {
      await seed.seedBlock(1, 2);
      await seed.seedBlock(1, 3);

      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        index: 0,
        count: 1,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data.length, failMsg(res)).toBe(1);
    });

    it('TC04 — Phân trang: index=1 bỏ qua item đầu tiên', async () => {
      await seed.seedBlock(1, 2);
      await seed.seedBlock(1, 3);

      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data.length, failMsg(res)).toBeGreaterThanOrEqual(1);
    });

    it('TC05 — index lớn hơn tổng số block → trả mảng rỗng', async () => {
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        index: 10,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data, failMsg(res)).toEqual([]);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — THIẾU THAM SỐ
   * ─────────────────────────────────────────────
   */

  describe('Thất bại — thiếu tham số', () => {
    it('TC06 — Bỏ trống index và count', async () => {
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {});

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC07 — Bỏ trống token', async () => {
      const res = await callApi(null, {
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(401);
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — SAI KIỂU DỮ LIỆU
   * ─────────────────────────────────────────────
   */

  describe('Thất bại — sai kiểu dữ liệu', () => {
    it('TC08 — index là chuỗi ("abc")', async () => {
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        index: 'abc',
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC09 — count là chuỗi ("abc")', async () => {
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        index: 0,
        count: 'abc',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC10 — index âm (-1)', async () => {
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        index: -1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC11 — count = 0', async () => {
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, {
        index: 0,
        count: 0,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */

  describe('Thất bại — token không hợp lệ', () => {
    it('TC12 — Token sai định dạng', async () => {
      const res = await callApi('invalid.token.here', {
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC13 — Token hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );

      const res = await callApi(expiredToken, {
        index: 0,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(401);
    });
  });
});
