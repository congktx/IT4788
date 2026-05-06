/**
 * FILE: test/e2e/get-notification.e2e.spec.ts
 *
 * Test API POST /notification/get_notification
 *
 * CÁCH CHẠY:
 *   npm run test:e2e:full -- --forceExit
 *
 * DỮ LIỆU MẪU SAU seedAll():
 *   Users        : user1 → user5
 *   Notification : user1 có 2 notification (1 chưa đọc, 1 đã đọc)
 */

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
  UNKNOWN_ERROR: { code: '1005', message: 'Unknown error.' },
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

beforeEach(async () => {
  await seed.clearAll();
  await seed.seedAll();
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function callApi(token: string | null, body: object) {
  const req = request(app.getHttpServer())
    .post('/notification/get_notification')
    .send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

// ─────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────

describe('POST /notification/get_notification', () => {
  // ── THÀNH CÔNG ────────────────────────────

  describe('Trường hợp thành công', () => {
    it('TC01 — Lấy danh sách notification: user có 2 notification (1 chưa đọc) → trả về đủ 2 item và badge = 1', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { index: 1, count: 10 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
      expect(res.body.data.length, failMsg(res)).toBe(2);
      expect(res.body.badge, failMsg(res)).toBe(1);
      expect(res.body.last_update, failMsg(res)).toBeDefined();
    });

    it('TC02 — User chưa có notification nào → trả về danh sách rỗng và badge = 0', async () => {
      const token = generateAuthToken(3, 'user_3');
      const res = await callApi(token, { index: 1, count: 10 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data, failMsg(res)).toEqual([]);
      expect(res.body.badge, failMsg(res)).toBe(0);
    });

    it('TC03 — Phân trang: index vượt quá tổng số notification → trả về danh sách rỗng', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { index: 2, count: 10 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data, failMsg(res)).toEqual([]);
    });

    it('TC04 — Phân trang: count = 1 thì chỉ trả về 1 notification dù user có nhiều hơn', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { index: 1, count: 1 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data.length, failMsg(res)).toBe(1);
    });

    it('TC05 — Notification của user khác không ảnh hưởng đến kết quả của user hiện tại', async () => {
      await seed.seedNotification(
        2,
        'Notification của user2',
        false,
        'general',
      );

      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { index: 1, count: 10 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.data.length, failMsg(res)).toBe(2);
    });
  });

  // ── THẤT BẠI — THIẾU THAM SỐ ─────────────

  describe('Thất bại — thiếu tham số bắt buộc', () => {
    it('TC06 — Không gửi token xác thực → từ chối truy cập với HTTP 401', async () => {
      const res = await callApi(null, { index: 1, count: 10 });
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC07 — Thiếu index → trả về lỗi 1002 thiếu tham số', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { count: 10 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
    });

    it('TC08 — Thiếu count → trả về lỗi 1002 thiếu tham số', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { index: 1 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
    });

    it('TC09 — Không gửi body (thiếu cả index lẫn count) → trả về lỗi 1002 thiếu tham số', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {});

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
    });
  });

  // ── THẤT BẠI — TOKEN ──────────────────────

  describe('Thất bại — token không hợp lệ', () => {
    it('TC10 — Token sai định dạng → từ chối truy cập với HTTP 401', async () => {
      const res = await callApi('invalid.token.here', { index: 1, count: 10 });
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC11 — Token đã hết hạn → từ chối truy cập với HTTP 401', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, { index: 1, count: 10 });
      expect(res.status, failMsg(res)).toBe(401);
    });
  });
});
