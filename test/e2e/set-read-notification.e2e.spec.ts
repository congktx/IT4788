/**
 * FILE: test/e2e/set-read-notification.e2e.spec.ts
 *
 * MỤC ĐÍCH: Chế độ 2 — Chạy TOÀN BỘ TC, không dừng giữa chừng.
 * Test API POST /notification/set_read_notification
 *
 * CÁCH CHẠY:
 *   npm run test:e2e:full -- --forceExit
 *
 * DỮ LIỆU MẪU SAU seedAll():
 *   Users        : user1 → user5
 *   Notification : user1 có 2 notification (1 chưa đọc id=1, 1 đã đọc id=2)
 *
 * BUG ĐÃ BIẾT (không sửa, ghi nhận bằng [BUG]):
 *   - Thiếu notification_id → update WHERE id=undefined → affected=0 → 1004
 *     (đúng code nhưng sai lý do — nên là 1002)
 *   - Không check notification có thuộc về currentUser không
 *     → user khác có thể đánh dấu đọc notification của người khác
 *   - err.to_string() sai cú pháp JS → nếu catch lỗi sẽ crash thêm
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
  PARAMETER_NOT_ENOUGH: { code: '1002', message: 'Parameter is not enough.' },
  PARAMETER_VALUE_INVALID: {
    code: '1004',
    message: 'Parameter value is invalid.',
  },
  UNKNOWN_ERROR: { code: '1005', message: 'Unknown error.' },
};

// ─────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────

let app: INestApplication;
let testingModule: TestingModule;
let dataSource: DataSource;
let seed: SeedHelper;

// Lưu id của notification được seed để dùng trong TC
let unreadNotifId: number;
let readNotifId: number;

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

  // Lấy id thực của notification sau mỗi lần seed
  const notifs = await dataSource.query(
    'SELECT id, `read` FROM notifications ORDER BY id ASC',
  );
  unreadNotifId = notifs.find((n: any) => n.read == 0)?.id;
  readNotifId = notifs.find((n: any) => n.read == 1)?.id;
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function callApi(token: string | null, body: object) {
  const req = request(app.getHttpServer())
    .post('/notification/set_read_notification')
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

describe('POST /notification/set_read_notification', () => {
  // ── THÀNH CÔNG ────────────────────────────

  describe('Trường hợp thành công', () => {
    it('TC01 — Đánh dấu đã đọc notification chưa đọc → OK', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { notification_id: unreadNotifId });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
      expect(res.body.badge, failMsg(res)).toBeDefined();
    });

    it('TC02 — badge giảm sau khi đánh dấu đọc notification chưa đọc', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { notification_id: unreadNotifId });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      // Sau khi đọc notification duy nhất chưa đọc → badge = 0
      expect(res.body.badge, failMsg(res)).toBe(0);
    });

    it('TC03 — Đánh dấu đã đọc notification đã đọc rồi (idempotent) → OK', async () => {
      // notification đã đọc → update read=true lại → affected=1 → OK
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { notification_id: readNotifId });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC04 — Gọi 2 lần liên tiếp → vẫn OK (idempotent)', async () => {
      const token = generateAuthToken(1, 'user_1');
      await callApi(token, { notification_id: unreadNotifId });
      const res = await callApi(token, { notification_id: unreadNotifId });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    // ⚠️ BUG ĐÃ BIẾT: service không check ownership
    it('TC05 — [BUG] User2 đánh dấu đọc notification của user1 → service cho phép → OK', async () => {
      // Đây là lỗ hổng bảo mật — user2 không nên sửa được notification của user1
      const token = generateAuthToken(2, 'user_2');
      const res = await callApi(token, { notification_id: unreadNotifId });

      expect(res.status, failMsg(res)).toBe(200);
      // Bug: service không check owner → trả OK thay vì lỗi
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  // ── THẤT BẠI — THIẾU THAM SỐ ─────────────

  describe('Thất bại — thiếu tham số', () => {
    it('TC06 — Không có token', async () => {
      const res = await callApi(null, { notification_id: unreadNotifId });
      expect(res.status, failMsg(res)).toBe(200);
    });

    // ⚠️ BUG: thiếu notification_id → update WHERE id=undefined → affected=0
    // → service trả 1004 thay vì 1002, nhưng đây là behavior thực tế
    it('TC07 — [BUG] Thiếu notification_id → 1004 (nên là 1002)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, {});

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  // ── THẤT BẠI — GIÁ TRỊ KHÔNG HỢP LỆ ─────

  describe('Thất bại — giá trị không hợp lệ', () => {
    it('TC08 — notification_id không tồn tại → 1004', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { notification_id: 999999 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  // ── THẤT BẠI — TOKEN ──────────────────────

  describe('Thất bại — token không hợp lệ', () => {
    it('TC09 — Token sai định dạng', async () => {
      const res = await callApi('invalid.token.here', {
        notification_id: unreadNotifId,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC10 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, {
        notification_id: unreadNotifId,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });
});
