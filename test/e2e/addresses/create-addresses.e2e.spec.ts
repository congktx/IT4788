import { addressAction } from '../../helpers/actions/address.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;

const validPayload = {
  receiver_name: 'Nguyen Van A',
  phone: '0123456789',
  full_address: '123 Duong ABC, Quan 1, TP.HCM',
  is_default: false,
  ward_id: 8,
  lat: 10.7769,
  lng: 106.7009,
};

beforeAll(() => {
  [U1, U2] = getTestUsers();
});

describe('POST /addresses/create', () => {
  // Thành công
  describe('Thành công', () => {
    it('TC01 — Tạo địa chỉ mới thành công — trả về data address', async () => {
      const res = await addressAction.createAddress(U1.token, validPayload);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      const data = res.body.data || res.body;
      expect(data.receiver_name, failMsg(res)).toBe(validPayload.receiver_name);
    });

    it('TC02 — Tạo địa chỉ với is_default = true — OK', async () => {
      const res = await addressAction.createAddress(U1.token, {
        ...validPayload,
        is_default: true,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC03 — Tạo địa chỉ với is_default = false — OK', async () => {
      const res = await addressAction.createAddress(U1.token, {
        ...validPayload,
        is_default: false,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC04 — Tạo nhiều địa chỉ cho cùng 1 user — OK', async () => {
      // Tạo thêm
      const res2 = await addressAction.createAddress(U1.token, {
        ...validPayload,
        receiver_name: 'Nguyen Van B',
      });
      expect(res2.status, failMsg(res2)).toBe(200);
      expect(res2.body.code, failMsg(res2)).toBe(RESPONSE.OK.code);
    });

    it('TC05 — 2 user khác nhau tạo địa chỉ không ảnh hưởng nhau — OK', async () => {
      const res2 = await addressAction.createAddress(U2.token, {
        ...validPayload,
        receiver_name: 'User 2 Receiver',
      });
      expect(res2.status, failMsg(res2)).toBe(200);
      expect(res2.body.code, failMsg(res2)).toBe(RESPONSE.OK.code);
    });
  });

  // Thất bại -> Thiếu tham số
  describe('Thiếu tham số', () => {
    it('TC06 — Không có token, có đủ tham số — TOKEN_INVALID', async () => {
      const res = await addressAction.createAddressRaw(null, validPayload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC07 — Có token, Body rỗng — PARAMETER_NOT_ENOUGH', async () => {
      const res = await addressAction.createAddressRaw(U1.token, {});
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC08 — Thiếu receiver_name — PARAMETER_NOT_ENOUGH', async () => {
      const { receiver_name, ...payload } = validPayload;
      const res = await addressAction.createAddressRaw(U1.token, payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC09 — Thiếu phone — PARAMETER_NOT_ENOUGH', async () => {
      const { phone, ...payload } = validPayload;
      const res = await addressAction.createAddressRaw(U1.token, payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC10 — Thiếu full_address — PARAMETER_NOT_ENOUGH', async () => {
      const { full_address, ...payload } = validPayload;
      const res = await addressAction.createAddressRaw(U1.token, payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC11 — Thiếu receiver_name và phone — PARAMETER_NOT_ENOUGH', async () => {
      const { receiver_name, phone, ...payload } = validPayload;
      const res = await addressAction.createAddressRaw(U1.token, payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC12 — Thiếu receiver_name và full_address — PARAMETER_NOT_ENOUGH', async () => {
      const { receiver_name, full_address, ...payload } = validPayload;
      const res = await addressAction.createAddressRaw(U1.token, payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC13 — Thiếu phone và full_address — PARAMETER_NOT_ENOUGH', async () => {
      const { phone, full_address, ...payload } = validPayload;
      const res = await addressAction.createAddressRaw(U1.token, payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });
  });

  // Thất bại -> Sai kiểu hoặc giá trị tham số
  describe('Sai kiểu hoặc giá trị tham số', () => {
    it('TC14 — receiver_name là số — PARAMETER_TYPE_INVALID', async () => {
      const res = await addressAction.createAddressRaw(U1.token, {
        ...validPayload,
        receiver_name: 12345,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC15 — receiver_name là boolean — PARAMETER_TYPE_INVALID', async () => {
      const res = await addressAction.createAddressRaw(U1.token, {
        ...validPayload,
        receiver_name: true,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC16 — phone là số — PARAMETER_TYPE_INVALID', async () => {
      const res = await addressAction.createAddressRaw(U1.token, {
        ...validPayload,
        phone: 987654321,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC17 — full_address là số — PARAMETER_TYPE_INVALID', async () => {
      const res = await addressAction.createAddressRaw(U1.token, {
        ...validPayload,
        full_address: 123,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC18 — is_default là chuỗi ("true") — PARAMETER_TYPE_INVALID', async () => {
      const res = await addressAction.createAddressRaw(U1.token, {
        ...validPayload,
        is_default: 'true',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC19 — is_default là số (1) — PARAMETER_TYPE_INVALID', async () => {
      const res = await addressAction.createAddressRaw(U1.token, {
        ...validPayload,
        is_default: 1,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });
  });

  // Thất bại -> Token không hợp lệ
  describe('Token không hợp lệ', () => {
    it('TC20 — Token sai định dạng — TOKEN_INVALID', async () => {
      const res = await addressAction.createAddressRaw(
        'invalid.token.here',
        validPayload,
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC21 — Token hết hạn — TOKEN_INVALID', async () => {
      const res = await addressAction.createAddressRaw(
        EXPIRED_TOKEN,
        validPayload,
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
