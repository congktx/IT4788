import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { createTestApp } from '../../helpers/create-test-app';
import { SeedHelper } from '../../helpers/seed.helper';
import { generateAuthToken } from '../../helpers/auth.helper';

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
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// Reset DB trước mỗi TC — đảm bảo TC độc lập
beforeEach(async () => {
  await seed.clearAll();
  await seed.seedAll();
});

function callApi(endpoint: string, token: string | null, body: object) {
  const req = request(app.getHttpServer())
    .post(`/conversation/${endpoint}`)
    .send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('POST /conversation/get_conversation', () => {
  // ── THÀNH CÔNG — dùng partner_id ──────────

  describe('Trường hợp thành công — theo partner_id', () => {
    it('TC24 — Lấy conversation theo partner_id, có tin nhắn', async () => {
      // seedAll đã tạo conversation user1 ↔ user2, có 1 message
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        partner_id: 2,
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(Array.isArray(res.body.data.messages), failMsg(res)).toBe(true);
      expect(
        res.body.data.messages.length,
        failMsg(res),
      ).toBeGreaterThanOrEqual(1);
      expect(res.body.data.can_send_message, failMsg(res)).toBe(true);
    });

    it('TC25 — Lấy conversation với partner chưa nhắn tin → messages rỗng, can_send_message = true', async () => {
      // user3 và user4 chưa có conversation
      const token = generateAuthToken(3, 'user_3');
      const res = await callApi('get_conversation', token, {
        partner_id: 4,
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data.messages, failMsg(res)).toEqual([]);
      expect(res.body.data.can_send_message, failMsg(res)).toBe(true);
    });

    it('TC26 — can_send_message = false khi có block (user1 ↔ user5)', async () => {
      // Cần tạo conversation giữa user1 và user5 (dù có block)
      // Tạo thẳng qua seed để bypass service check
      await seed.seedConversation([1, 5]);
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        partner_id: 5,
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data.can_send_message, failMsg(res)).toBe(false);
    });

    it('TC27 — Phân trang: index=2 trả về mảng rỗng khi ít tin nhắn', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        partner_id: 2,
        index: 2,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data.messages, failMsg(res)).toEqual([]);
    });
  });

  // ── THÀNH CÔNG — dùng conversation_id ─────

  describe('Trường hợp thành công — theo conversation_id', () => {
    it('TC28 — Lấy conversation theo conversation_id hợp lệ', async () => {
      // Lấy id conversation từ send_message trước
      const sendToken = generateAuthToken(1, 'user_1');
      const sendRes = await callApi('send_message', sendToken, {
        to_id: 2,
        message: 'test',
        type_message: 'text',
      });
      const convId = sendRes.body.data.conversation_id;

      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        conversation_id: convId,
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(Array.isArray(res.body.data.messages), failMsg(res)).toBe(true);
    });
  });

  // ── THẤT BẠI — THIẾU THAM SỐ ─────────────

  describe('Thất bại — thiếu tham số', () => {
    it('TC29 — Không có token', async () => {
      const res = await callApi('get_conversation', null, {
        partner_id: 2,
        index: 1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC30 — Không có partner_id lẫn conversation_id', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC31 — Thiếu index', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        partner_id: 2,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC32 — Thiếu count', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        partner_id: 2,
        index: 1,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  // ── THẤT BẠI — GIÁ TRỊ KHÔNG HỢP LỆ ─────

  describe('Thất bại — giá trị không hợp lệ', () => {
    it('TC33 — Tự lấy conversation với chính mình (partner_id = currentUser)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        partner_id: 1,
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC34 — conversation_id không tồn tại', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        conversation_id: 999999,
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC35 — partner_id không tồn tại', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi('get_conversation', token, {
        partner_id: 999999,
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  // ── THẤT BẠI — TOKEN ──────────────────────

  describe('Thất bại — token không hợp lệ', () => {
    it('TC36 — Token sai định dạng', async () => {
      const res = await callApi('get_conversation', 'bad.token', {
        partner_id: 2,
        index: 1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });

    it('TC37 — Token đã hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi('get_conversation', expiredToken, {
        partner_id: 2,
        index: 1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
    });
  });
});
