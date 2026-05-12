/**
 * test/e2e/update-order-address.e2e.spec.ts
 *
 * MỤC ĐÍCH: Test API PATCH /order/update/:id
 * ĐẶC ĐIỂM: Các field đều là Optional. Test tập trung vào Logic và Idempotency.
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
  OK: { code: '1000' },
  PARAMETER_VALUE_INVALID: { code: '1004' }, // Lỗi Validation sai kiểu dữ liệu hoặc không tồn tại sẽ trả mã này
  ACTION_DONE_PREVIOUSLY: { code: '1010' }, // Lỗi khi gửi trùng lặp data
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
  await seed.seedAll(); // Khởi tạo User, Wards, Provinces
});

function callApi(token: string | null, id: number | string, body: object) {
  const req = request(app.getHttpServer())
    .patch(`/order/update/${id}`)
    .send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

describe('PATCH /order/update/:id', () => {
  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */
  describe('Thành công', () => {
    it('TC01 — Chỉ cập nhật 1 trường duy nhất (Đổi phone)', async () => {
      const address = await seed.seedAddress(1, { phone: '0111111111' });
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, address.id, { phone: '0999999999' });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC02 — Cập nhật nhiều trường cùng lúc', async () => {
      const address = await seed.seedAddress(1);
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, address.id, {
        phone: '0999999999',
        receiver_name: 'Tên Đã Đổi',
        address: 'Tên địa chỉ mới',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC03 — Cập nhật is_default = true', async () => {
      // Địa chỉ 1 đang là default
      await seed.seedAddress(1, { address_name: 'DC 1', is_default: true });
      // Địa chỉ 2 là bình thường
      const address2 = await seed.seedAddress(1, {
        address_name: 'DC 2',
        is_default: false,
      });

      const token = generateAuthToken(1, 'user_1');
      // Đổi địa chỉ 2 thành default
      const res = await callApi(token, address2.id, { is_default: true });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      // Backend sẽ tự đổi DC 1 thành false
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — LỖI NGHIỆP VỤ LOGIC
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Lỗi Nghiệp Vụ (Logic)', () => {
    it('TC04 — Cập nhật địa chỉ KHÔNG TỒN TẠI (ID ảo)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, 999999, { phone: '0123' });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC05 — Cập nhật địa chỉ CỦA NGƯỜI KHÁC', async () => {
      // User 2 tạo địa chỉ
      const addrUser2 = await seed.seedAddress(2);

      // User 1 lấy Token đi sửa địa chỉ của User 2
      const tokenUser1 = generateAuthToken(1, 'user_1');
      const res = await callApi(tokenUser1, addrUser2.id, { phone: '0123' });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC06 — Gửi ward_id không tồn tại trong hệ thống', async () => {
      const address = await seed.seedAddress(1);
      const token = generateAuthToken(1, 'user_1');

      // ward_id = 999999 chắc chắn không có trong DB
      const res = await callApi(token, address.id, { address_id: [999999, 1] });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC07 — Lỗi trùng lặp (Gửi thông tin ward_id và address y hệt data cũ)', async () => {
      const address = await seed.seedAddress(1, {
        ward_id: 1,
        address_name: 'Tên Y Hệt Cũ',
      });
      const token = generateAuthToken(1, 'user_1');

      const res = await callApi(token, address.id, {
        address_id: [1, 1], // Giống hệt ward_id cũ
        address: 'Tên Y Hệt Cũ',
      });

      expect(res.status, failMsg(res)).toBe(200);
      // Lỗi hệ thống chặn Spam / Cập nhật vô nghĩa
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.code,
      );
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — SAI KIỂU DỮ LIỆU
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Sai kiểu dữ liệu', () => {
    let addressId: number;
    let token: string;

    beforeEach(async () => {
      const addr = await seed.seedAddress(1);
      addressId = addr.id;
      token = generateAuthToken(1, 'user_1');
    });

    // Do ValidationPipe tùy chỉnh của dự án luôn quy đổi mọi lỗi type về 1004
    it('TC08 — URL Param :id là chữ thay vì số', async () => {
      const res = await callApi(token, 'chu_ne', { phone: '0123' });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC09 — address gửi số', async () => {
      const res = await callApi(token, addressId, { address: 123 });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC10 — is_default gửi chuỗi "true"', async () => {
      const res = await callApi(token, addressId, { is_default: 'true' });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC11 — address_id gửi chuỗi "1,2"', async () => {
      const res = await callApi(token, addressId, { address_id: '1,2' });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC12 — lat gửi chuỗi', async () => {
      const res = await callApi(token, addressId, { lat: '10.0' });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC13 — lng gửi chuỗi', async () => {
      const res = await callApi(token, addressId, { lng: '106.0' });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC14 — receiver_name gửi số', async () => {
      const res = await callApi(token, addressId, { receiver_name: 999 });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC15 — phone gửi mảng', async () => {
      const res = await callApi(token, addressId, { phone: ['0123'] });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC16 — full_address gửi số', async () => {
      const res = await callApi(token, addressId, { full_address: 123 });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC17 — address_detail gửi mảng', async () => {
      const res = await callApi(token, addressId, { address_detail: [] });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Token không hợp lệ', () => {
    it('TC18 — Không gửi Token', async () => {
      const res = await callApi(null, 1, { phone: '0123' });
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC19 — Token sai định dạng', async () => {
      const res = await callApi('invalid-token', 1, { phone: '0123' });
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC20 — Token hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, 1, { phone: '0123' });
      expect(res.status, failMsg(res)).toBe(401);
    });
  });
});
