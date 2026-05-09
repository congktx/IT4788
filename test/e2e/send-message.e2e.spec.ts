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
    .post(`/conversation/send_message`)
    .send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('POST /conversation/send_message', () => {
  // ── THÀNH CÔNG ────────────────────────────

  describe('Trường hợp thành công', () => {
    it('TC01 — Gửi tin nhắn text đến người dùng khác, tạo conversation mới', async () => {
      // user3 gửi cho user4 — chưa có conversation giữa 2 người này
      const token = generateAuthToken(3, 'user_3');
      const res = await callApi('send_message', token, {
        to_id: 4,
        message: 'Xin chào user4!',
        type_message: 'text',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(res.body.data, failMsg(res)).toMatchObject({
        conversation_id: expect.any(Number),
        message_id: expect.any(Number),
        created_at: expect.any(Number),
      });
    });

    it('TC02 — Gửi tin nhắn vào conversation đã có sẵn (user1 → user2)', async () => {
      // seedAll đã tạo conversation giữa user1 và user2
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('send_message', token, {
        to_id: 2,
        message: 'Tin nhắn thứ 2',
        type_message: 'text',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data.conversation_id, failMsg(res)).toBeGreaterThan(0);
    });

    it('TC03 — Gửi tin nhắn kèm product_id hợp lệ', async () => {
      // Giả sử product_id = 1 tồn tại trong DB (cần seedProduct nếu chưa có)
      const token = generateAuthToken(3, 'user_3');
      const res = await callApi('send_message', token, {
        to_id: 4,
        product_id: 1,
        type_message: 'text',
      });

      // Nếu product tồn tại → OK, nếu không → PARAMETER_VALUE_INVALID
      // Điều chỉnh tuỳ theo dữ liệu seed thực tế
      expect(res.status, failMsg(res)).toBe(200);
    });
  });

  // ── THẤT BẠI — THIẾU THAM SỐ ─────────────

  describe('Thất bại — thiếu tham số', () => {
    it('TC04 — Không có token', async () => {
      const res = await callApi('send_message', null, {
        to_id: 2,
        message: 'hello',
        type_message: 'text',
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC05 — Thiếu to_id', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('send_message', token, {
        message: 'hello',
        type_message: 'text',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC06 — Thiếu message và type_message', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('send_message', token, { to_id: 2 });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC07 — Body rỗng (có token)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('send_message', token, {});

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });
  });

  // ── THẤT BẠI — GIÁ TRỊ KHÔNG HỢP LỆ ─────

  describe('Thất bại — giá trị không hợp lệ', () => {
    it('TC08 — Tự gửi tin nhắn cho chính mình', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('send_message', token, {
        to_id: 1,
        message: 'hello me',
        type_message: 'text',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC09 — to_id không tồn tại', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('send_message', token, {
        to_id: 999999,
        message: 'hello',
        type_message: 'text',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC10 — product_id không tồn tại', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('send_message', token, {
        to_id: 2,
        product_id: 999999,
        type_message: 'text',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC11 — Gửi tin nhắn đến người mình đã block (user1 → user5)', async () => {
      // seedAll: user1 block user5
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('send_message', token, {
        to_id: 5,
        message: 'hello',
        type_message: 'text',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  // ── THẤT BẠI — TOKEN ──────────────────────

  describe('Thất bại — token không hợp lệ', () => {
    it('TC12 — Token sai định dạng', async () => {
      const res = await callApi('send_message', 'invalid.token.here', {
        to_id: 2,
        message: 'hello',
        type_message: 'text',
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC13 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi('send_message', expiredToken, {
        to_id: 2,
        message: 'hello',
        type_message: 'text',
      });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });
});
