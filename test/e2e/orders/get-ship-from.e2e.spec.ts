import { orderAction } from '../../helpers/actions/order.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;

beforeAll(() => {
  [U1] = getTestUsers();
});

describe('GET /order/get_ship_from', () => {
  describe('Thành công', () => {
    it('TC01 — Truyen day du tham so hop le lay theo cap Tinh', async () => {
      const res = await orderAction.getShipFrom(
        U1.token,
        'level=1&index=0&count=10&parent_id=2',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });

    it('TC02 — Truyen day du tham so hop le lay theo cap Phuong', async () => {
      const res = await orderAction.getShipFrom(
        U1.token,
        'level=0&index=0&count=10&parent_id=1',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  describe('Thất bại — Thiếu tham số bắt buộc', () => {
    it('TC05 — Thieu tham so bat buoc index', async () => {
      const res = await orderAction.getShipFromRaw(
        U1.token,
        'level=0&count=10&parent_id=1',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC06 — Thieu tham so bat buoc count', async () => {
      const res = await orderAction.getShipFromRaw(
        U1.token,
        'level=0&index=0&parent_id=1',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC07 — Thieu tham so bat buoc parent_id', async () => {
      const res = await orderAction.getShipFromRaw(
        U1.token,
        'level=0&index=0&count=10',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });
  });

  describe('Thất bại — Sai kiểu dữ liệu', () => {
    it('TC08 — Truyen chu cho tham so level', async () => {
      const res = await orderAction.getShipFromRaw(
        U1.token,
        'level=chu&index=0&count=10&parent_id=1',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC10 — Tham so index la so am', async () => {
      const res = await orderAction.getShipFromRaw(
        U1.token,
        'level=0&index=-5&count=10&parent_id=1',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  describe('Thất bại — Nghiệp vụ Logic', () => {
    it('TC14 — Tra cuu cap Tinh nhung parent_id khong ton tai trong he thong', async () => {
      const res = await orderAction.getShipFromRaw(
        U1.token,
        'level=1&index=0&count=10&parent_id=999999',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  describe('Thất bại — Token không hợp lệ', () => {
    it('TC16 — Khong truyen Token tren Header', async () => {
      const res = await orderAction.getShipFromRaw(
        null,
        'level=0&index=0&count=10&parent_id=1',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC17 — Token sai dinh dang', async () => {
      const res = await orderAction.getShipFromRaw(
        'invalid-token',
        'level=0&index=0&count=10&parent_id=1',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC18 — Token da het han', async () => {
      const res = await orderAction.getShipFromRaw(
        EXPIRED_TOKEN,
        'level=0&index=0&count=10&parent_id=1',
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
