import { orderAction } from '../../helpers/actions/order.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg, api } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;

let validPayload = {
  address: 'Tên gợi nhớ địa chỉ',
  is_default: false,
  address_id: [7, 1],
  lat: 10.7769,
  lng: 106.7009,
  receiver_name: 'Nguyen Van A',
  phone: '0123456789',
  full_address: '123 Đường ABC, Quận 1',
  address_detail: 'Tầng 5, Tòa nhà X',
};

beforeAll(async () => {
  [U1, U2] = getTestUsers();
});

describe('POST /order/add_order_address', () => {
  describe('Thành công', () => {
    it('TC01 — Tạo địa chỉ với đầy đủ tham số hợp lệ (is_default = false)', async () => {
      const res = await orderAction.addOrderAddress(U1.token, validPayload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC02 — Tạo địa chỉ với is_default = true', async () => {
      const res = await orderAction.addOrderAddress(U1.token, {
        ...validPayload,
        is_default: true,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC03 — Ghi đè default', async () => {
      await orderAction.addOrderAddress(U1.token, {
        ...validPayload,
        is_default: true,
      });
      const res = await orderAction.addOrderAddress(U1.token, {
        ...validPayload,
        address: 'Mới',
        is_default: true,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  describe('Thất bại — Bỏ trống từng tham số bắt buộc', () => {
    const requiredFields = [
      'address',
      'lat',
      'lng',
      'receiver_name',
      'phone',
      'full_address',
      'address_detail',
    ];

    requiredFields.forEach((field, index) => {
      it(`TC0${4 + index} — Thiếu ${field}`, async () => {
        const payload = { ...validPayload };
        delete (payload as any)[field];
        const res = await orderAction.addOrderAddressRaw(U1.token, payload);
        expect(res.status, failMsg(res)).toBe(200);
        expect(res.body.code, failMsg(res)).toBe(
          RESPONSE.PARAMETER_NOT_ENOUGH.code,
        );
      });
    });
  });

  describe('Thất bại — Bỏ trống kết hợp nhiều tham số', () => {
    it('TC11 — Thiếu bộ đôi lat và lng', async () => {
      const { lat, lng, ...payload } = validPayload;
      const res = await orderAction.addOrderAddressRaw(U1.token, payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC12 — Thiếu bộ ba liên hệ (receiver_name, phone, full_address)', async () => {
      const { receiver_name, phone, full_address, ...payload } = validPayload;
      const res = await orderAction.addOrderAddressRaw(U1.token, payload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC13 — Gửi Body rỗng {}', async () => {
      const res = await orderAction.addOrderAddressRaw(U1.token, {});
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });
  });

  describe('Thất bại — Sai kiểu dữ liệu', () => {
    const invalidDataCases = [
      { field: 'address', value: 12345 },
      { field: 'lat', value: '10.123' },
      { field: 'lng', value: '106.123' },
      { field: 'receiver_name', value: 9999 },
      { field: 'phone', value: ['0123'] },
      { field: 'full_address', value: 111 },
    ];

    invalidDataCases.forEach((tc, idx) => {
      it(`TC${14 + idx} — ${tc.field} gửi sai kiểu`, async () => {
        const payload = { ...validPayload, [tc.field]: tc.value };
        const res = await orderAction.addOrderAddressRaw(U1.token, payload);
        expect(res.status, failMsg(res)).toBe(200);
        expect(res.body.code, failMsg(res)).toBe(
          RESPONSE.PARAMETER_TYPE_INVALID.code,
        );
      });
    });
  });

  describe('Thất bại — Token không hợp lệ', () => {
    it('TC20 — Không gửi Token', async () => {
      const res = await orderAction.addOrderAddressRaw(null, validPayload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC21 — Token sai định dạng', async () => {
      const res = await orderAction.addOrderAddressRaw('invalid', validPayload);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC22 — Token hết hạn', async () => {
      const res = await orderAction.addOrderAddressRaw(
        EXPIRED_TOKEN,
        validPayload,
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
