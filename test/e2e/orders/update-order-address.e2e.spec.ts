import { orderAction } from '../../helpers/actions/order.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg, api } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;

let addr1Id: number;
let addr2Id: number;

beforeAll(async () => {
  [U1, U2] = getTestUsers();

  // BỎ QUA HOÀN TOÀN VIỆC GỌI API get_ship_from

  const baseAddress = {
    is_default: false,
    address_id: [7, 1], // GÁN TRỰC TIẾP ID HỢP LỆ VÀO ĐÂY (ward_id = 7, province_id = 1)
    lat: 10.7769,
    lng: 106.7009,
    receiver_name: 'Nguyen Van A',
    phone: '0123456789',
    full_address: '123 Đường ABC, Quận 1',
    address_detail: 'Tầng 5',
  };

  // Tạo data mồi
  const res1 = await orderAction.addOrderAddress(U1.token, {
    ...baseAddress,
    address: 'Update Addr 1',
    phone: '0111111111',
  });
  const data1 = res1.body.data || res1.body;
  addr1Id = data1.id;

  const res2 = await orderAction.addOrderAddress(U2.token, {
    ...baseAddress,
    address: 'Update Addr 2',
  });
  const data2 = res2.body.data || res2.body;
  addr2Id = data2.id;
});

describe('PATCH /order/update/:id', () => {
  // Thành công
  describe('Thành công', () => {
    it('TC01 — Chỉ cập nhật 1 trường duy nhất (Đổi phone)', async () => {
      const res = await orderAction.updateOrderAddress(U1.token, addr1Id, {
        phone: '0999999999',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC02 — Cập nhật nhiều trường cùng lúc', async () => {
      const res = await orderAction.updateOrderAddress(U1.token, addr1Id, {
        phone: '0888888888',
        receiver_name: 'Tên Đã Đổi',
        address: 'Tên địa chỉ mới',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC03 — Cập nhật is_default = true', async () => {
      const res = await orderAction.updateOrderAddress(U1.token, addr1Id, {
        is_default: true,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  // Thất bại -> Lỗi Nghiệp Vụ (Logic)
  describe('Thất bại — Lỗi Nghiệp Vụ (Logic)', () => {
    it('TC04 — Cập nhật địa chỉ KHÔNG TỒN TẠI (ID ảo)', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, 999999, {
        phone: '0123',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC05 — Cập nhật địa chỉ CỦA NGƯỜI KHÁC', async () => {
      // User 1 lấy Token đi sửa địa chỉ của User 2
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr2Id, {
        phone: '0123',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC06 — Gửi ward_id không tồn tại trong hệ thống', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        address_id: [999999, 1],
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC07 — Lỗi trùng lặp (Gửi thông tin y hệt data cũ)', async () => {
      // Gọi lại với address vừa cập nhật ở TC02
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        address: 'Tên địa chỉ mới',
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect([
        RESPONSE.OK.code,
        RESPONSE.ACTION_DONE_PREVIOUSLY?.code || '1010',
      ]).toContain(res.body.code);
    });
  });

  // Thất bại -> Sai kiểu dữ liệu
  describe('Thất bại — Sai kiểu dữ liệu', () => {
    it('TC08 — URL Param :id là chữ thay vì số', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, 'chu_ne', {
        phone: '0123',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC09 — address gửi số', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        address: 123,
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC10 — is_default gửi chuỗi "true"', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        is_default: 'true',
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC11 — address_id gửi chuỗi "1,2"', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        address_id: '1,2',
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC12 — lat gửi chuỗi', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        lat: '10.0',
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC13 — lng gửi chuỗi', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        lng: '106.0',
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC14 — receiver_name gửi số', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        receiver_name: 999,
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC15 — phone gửi mảng', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        phone: ['0123'],
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC16 — full_address gửi số', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        full_address: 123,
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC17 — address_detail gửi mảng', async () => {
      const res = await orderAction.updateOrderAddressRaw(U1.token, addr1Id, {
        address_detail: [],
      });
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });
  });

  // Thất bại -> Token không hợp lệ
  describe('Thất bại — Token không hợp lệ', () => {
    it('TC18 — Không gửi Token', async () => {
      const res = await orderAction.updateOrderAddressRaw(null, addr1Id, {
        phone: '0123',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC19 — Token sai định dạng', async () => {
      const res = await orderAction.updateOrderAddressRaw(
        'invalid-token',
        addr1Id,
        { phone: '0123' },
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC20 — Token hết hạn', async () => {
      const res = await orderAction.updateOrderAddressRaw(
        EXPIRED_TOKEN,
        addr1Id,
        { phone: '0123' },
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
