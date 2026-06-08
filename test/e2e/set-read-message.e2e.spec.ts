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
  PARAMETER_TYPE_INVALID: {
    code: '1003',
    message: 'Parameter type is invalid.',
  },
  PARAMETER_VALUE_INVALID: {
    code: '1004',
    message: 'Parameter value is invalid.',
  },
  USER_NOT_EXIST: { code: '1013', message: 'User does not exist.' },
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
    .post(`/conversation/set_read_message`)
    .send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('POST /conversation/set_read_message', () => {
  // ── THÀNH CÔNG ────────────────────────────

  describe('Trường hợp thành công', () => {
    it('TC01 — Đánh dấu đã đọc với partner đang có conversation (user1 đọc tin từ user2)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('set_read_message', token, { partner_id: 2 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
    });

    it('TC02 — Đánh dấu đã đọc khi chưa có conversation → vẫn trả OK (không lỗi)', async () => {
      // user3 và user4 chưa có conversation — service vẫn trả OK
      const token = generateAuthToken(3, 'user_3');
      const res = await callApi('set_read_message', token, { partner_id: 4 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC03 — Gọi set_read_message 2 lần liên tiếp → vẫn OK (idempotent)', async () => {
      const token = generateAuthToken(1, 'user_1');
      await callApi('set_read_message', token, { partner_id: 2 });
      const res = await callApi('set_read_message', token, { partner_id: 2 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  // ── THẤT BẠI — THIẾU THAM SỐ ─────────────

  describe('Thất bại — thiếu tham số', () => {
    it('TC04 — Không có token', async () => {
      const res = await callApi('set_read_message', null, { partner_id: 2 });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC05 — Thiếu partner_id (có token)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('set_read_message', token, {});

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  // ── THẤT BẠI — GIÁ TRỊ KHÔNG HỢP LỆ ─────

  describe('Thất bại — giá trị không hợp lệ', () => {
    it('TC06 — partner_id không tồn tại', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('set_read_message', token, {
        partner_id: 999999,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC07 — Tự đánh dấu đã đọc tin của chính mình (partner_id = currentUser)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('set_read_message', token, { partner_id: 1 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  // ── THẤT BẠI — TOKEN ──────────────────────

  describe('Thất bại — token không hợp lệ', () => {
    it('TC08 — Token sai định dạng', async () => {
      const res = await callApi('set_read_message', 'bad.token', {
        partner_id: 2,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC09 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi('set_read_message', expiredToken, {
        partner_id: 2,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });
});
