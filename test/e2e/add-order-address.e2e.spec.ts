/**
 * test/e2e/add-order-address.e2e.spec.ts
 *
 * MỤC ĐÍCH: Test API POST /order/add_order_address
 * INPUT: address, is_default, address_id, lat, lng, receiver_name, phone, full_address, address_detail
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

function callApi(token: string | null, body: object) {
  const req = request(app.getHttpServer())
    .post('/order/add_order_address')
    .send(body);
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

function failMsg(res: any): string {
  return `\nFull response: ${JSON.stringify(res.body, null, 2)}`;
}

const validPayload = {
  address: 'Tên gợi nhớ địa chỉ',
  is_default: false,
  address_id: [1, 1], // [ward_id, province_id]
  lat: 10.7769,
  lng: 106.7009,
  receiver_name: 'Nguyen Van A',
  phone: '0123456789',
  full_address: '123 Đường ABC, Quận 1',
  address_detail: 'Tầng 5, Tòa nhà X',
};

describe('POST /order/add_order_address', () => {
  /**
   * ─────────────────────────────────────────────
   * THÀNH CÔNG
   * ─────────────────────────────────────────────
   */
  describe('Thành công', () => {
    it('TC01 — Tạo địa chỉ với đầy đủ tham số hợp lệ (is_default = false)', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, validPayload);

      expect(res.status, failMsg(res)).toBe(201); // Có thể đổi thành 200 nếu server thiết lập vậy
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const data = res.body.data || res.body;
      expect(data.address_name, failMsg(res)).toBe(validPayload.address);
      expect(data.ward_id, failMsg(res)).toBe(validPayload.address_id[0]);
    });

    it('TC02 — Tạo địa chỉ với is_default = true', async () => {
      const token = generateAuthToken(1, 'user_1');
      const res = await callApi(token, { ...validPayload, is_default: true });

      expect(res.status, failMsg(res)).toBe(201);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC03 — Ghi đè default (Có sẵn mặc định cũ, tạo mới đè lên)', async () => {
      const token = generateAuthToken(1, 'user_1');
      // Tạo cái 1 làm default
      await callApi(token, { ...validPayload, is_default: true });
      // Tạo cái 2 làm default mới
      const res = await callApi(token, {
        ...validPayload,
        address: 'Mặc định mới',
        is_default: true,
      });

      expect(res.status, failMsg(res)).toBe(201);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      // Logic kiểm tra bản ghi thứ 1 bị chuyển false có thể thực hiện bằng API GET
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — BỎ TRỐNG TỪNG THAM SỐ
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Bỏ trống từng tham số bắt buộc', () => {
    it('TC04 — Thiếu address', async () => {
      const { address, ...payload } = validPayload;
      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC05 — Thiếu lat', async () => {
      const { lat, ...payload } = validPayload;
      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC06 — Thiếu lng', async () => {
      const { lng, ...payload } = validPayload;
      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC07 — Thiếu receiver_name', async () => {
      const { receiver_name, ...payload } = validPayload;
      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC08 — Thiếu phone', async () => {
      const { phone, ...payload } = validPayload;
      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC09 — Thiếu full_address', async () => {
      const { full_address, ...payload } = validPayload;
      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC10 — Thiếu address_detail', async () => {
      const { address_detail, ...payload } = validPayload;

      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — THIẾU KẾT HỢP
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Bỏ trống kết hợp nhiều tham số', () => {
    it('TC11 — Thiếu bộ đôi lat và lng', async () => {
      const { lat, lng, ...payload } = validPayload;
      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC12 — Thiếu bộ ba liên hệ (receiver_name, phone, full_address)', async () => {
      const { receiver_name, phone, full_address, ...payload } = validPayload;
      const res = await callApi(generateAuthToken(1, 'user_1'), payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC13 — Gửi Body rỗng {}', async () => {
      const res = await callApi(generateAuthToken(1, 'user_1'), {});
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — SAI KIỂU DỮ LIỆU
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Sai kiểu dữ liệu', () => {
    it('TC14 — address gửi số thay vì chuỗi', async () => {
      const res = await callApi(generateAuthToken(1, 'user_1'), {
        ...validPayload,
        address: 12345,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    // Bỏ qua TC15 và TC16 theo yêu cầu của bạn

    it('TC17 — lat gửi chuỗi thay vì số thực', async () => {
      const res = await callApi(generateAuthToken(1, 'user_1'), {
        ...validPayload,
        lat: '10.123',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC18 — lng gửi chuỗi thay vì số thực', async () => {
      const res = await callApi(generateAuthToken(1, 'user_1'), {
        ...validPayload,
        lng: '106.123',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC19 — receiver_name gửi số', async () => {
      const res = await callApi(generateAuthToken(1, 'user_1'), {
        ...validPayload,
        receiver_name: 9999,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC20 — phone gửi mảng', async () => {
      const res = await callApi(generateAuthToken(1, 'user_1'), {
        ...validPayload,
        phone: ['0123'],
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC21 — full_address gửi số', async () => {
      const res = await callApi(generateAuthToken(1, 'user_1'), {
        ...validPayload,
        full_address: 111,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });
  });

  /**
   * ─────────────────────────────────────────────
   * THẤT BẠI — TOKEN
   * ─────────────────────────────────────────────
   */
  describe('Thất bại — Token không hợp lệ', () => {
    it('TC22 — Không gửi Token', async () => {
      const res = await callApi(null, validPayload);
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC23 — Token sai định dạng', async () => {
      const res = await callApi('this-is-invalid-token', validPayload);
      expect(res.status, failMsg(res)).toBe(401);
    });

    it('TC24 — Token hết hạn', async () => {
      const expiredToken = jwt.sign(
        { sub: 1, username: 'user_1', role: 'user' },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: -1 },
      );
      const res = await callApi(expiredToken, validPayload);
      expect(res.status, failMsg(res)).toBe(401);
    });
  });
});
