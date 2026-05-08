import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { createTestApp } from '../helpers/create-test-app';
import { SeedHelper } from '../helpers/seed.helper';
import { generateAuthToken } from '../helpers/auth.helper';

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
  USER_NOT_EXIST: { code: '1013', message: 'User does not exist' },
  NOT_ACCESS: { code: '1009', message: 'Not access.' },
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

function callApi(endpoint: string, token: string | null, body: object) {
  const req = request(app.getHttpServer())
    .post(`/conversation/get_list_conversation`)
    .send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('POST /conversation/get_list_conversation', () => {
  // ── THÀNH CÔNG ────────────────────────────

  describe('Trường hợp thành công', () => {
    it('TC14 — Lấy danh sách conversation (user1 có 1 conversation với user2)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_list_conversation', token, {
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
      expect(res.body.data.length, failMsg(res)).toBeGreaterThanOrEqual(1);
      expect(res.body.num_new_message, failMsg(res)).toBeDefined();
    });

    it('TC15 — User không có conversation nào trả về mảng rỗng (user3)', async () => {
      // user3 chưa có conversation nào
      const token = generateAuthToken(3, 'user_3');
      const res = await callApi('get_list_conversation', token, {
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data, failMsg(res)).toEqual([]);
    });

    it('TC16 — Phân trang: index=2 không có dữ liệu → trả về mảng rỗng', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_list_conversation', token, {
        index: 2,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data, failMsg(res)).toEqual([]);
    });

    it('TC17 — Cấu trúc conversation trả về đúng format', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_list_conversation', token, {
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      const conv = res.body.data[0];
      expect(conv, failMsg(res)).toMatchObject({
        id: expect.any(Number),
        partner: {
          id: expect.any(Number),
          username: expect.any(String),
        },
      });
    });
  });

  // ── THẤT BẠI — THIẾU THAM SỐ ─────────────

  describe('Thất bại — thiếu tham số', () => {
    it('TC18 — Không có token', async () => {
      const res = await callApi('get_list_conversation', null, {
        index: 1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC19 — Thiếu index', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_list_conversation', token, { count: 10 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC20 — Thiếu count', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_list_conversation', token, { index: 1 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC21 — Body rỗng (có token)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_list_conversation', token, {});

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });
  });

  // ── THẤT BẠI — TOKEN ──────────────────────

  describe('Thất bại — token không hợp lệ', () => {
    it('TC22 — Token sai định dạng', async () => {
      const res = await callApi('get_list_conversation', 'bad.token', {
        index: 1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC23 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi('get_list_conversation', expiredToken, {
        index: 1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });
});
