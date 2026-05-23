import { notificationAction } from '../../helpers/actions/notification.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;

beforeAll(() => {
  [U1, U2, U3] = getTestUsers();
});

describe('POST /notification/get_notification', () => {
  // Thành công
  describe('Thành công', () => {
    it('TC01 — Lấy danh sách thông báo hợp lệ — trả về đúng data và badge', async () => {
      const res = await notificationAction.getNotification(U1.token, {
        index: 1,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);

      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
      expect(typeof res.body.badge).toBe('number');
      if (res.body.data.length > 0) {
        expect(res.body.last_update).toBeDefined();
      }
    });

    it('TC02 — index lớn hơn tổng số thông báo — trả mảng rỗng', async () => {
      const res = await notificationAction.getNotification(U1.token, {
        index: 9999,
        count: 10,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data).toEqual([]);
    });

    it('TC03 — Phân trang: index=1, count=1 — trả về đúng 1 item', async () => {
      const res = await notificationAction.getNotification(U1.token, {
        index: 1,
        count: 1,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  // Thất bại -> Thiếu tham số
  describe('Thiếu tham số', () => {
    it('TC04 — Không có token, có đủ tham số — TOKEN_INVALID', async () => {
      const res = await notificationAction.getNotificationRaw(null, {
        index: 1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC05 — Có token, thiếu index — PARAMETER_NOT_ENOUGH', async () => {
      const res = await notificationAction.getNotificationRaw(U1.token, {
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC06 — Có token, thiếu count — PARAMETER_NOT_ENOUGH', async () => {
      const res = await notificationAction.getNotificationRaw(U1.token, {
        index: 1,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC07 — Có token, thiếu index và count — PARAMETER_NOT_ENOUGH', async () => {
      const res = await notificationAction.getNotificationRaw(U1.token, {});
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });
  });

  // Thất bại -> Sai kiểu hoặc giá trị tham số
  describe('Sai kiểu hoặc giá trị tham số', () => {
    it('TC08 — index là chuỗi không hợp lệ ("abc") — PARAMETER_TYPE_INVALID', async () => {
      const res = await notificationAction.getNotificationRaw(U1.token, {
        index: 'abc',
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });
    it('TC09 — count là chuỗi không hợp lệ ("abc") — PARAMETER_TYPE_INVALID', async () => {
      const res = await notificationAction.getNotificationRaw(U1.token, {
        index: 1,
        count: 'abc',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });
    it('TC10 — index âm (-1) — PARAMETER_VALUE_INVALID', async () => {
      const res = await notificationAction.getNotificationRaw(U1.token, {
        index: -1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
    it('TC11 — count = 0 — PARAMETER_VALUE_INVALID', async () => {
      const res = await notificationAction.getNotificationRaw(U1.token, {
        index: 1,
        count: 0,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  // Thất bại -> Token không hợp lệ
  describe('Token không hợp lệ', () => {
    it('TC12 — Token sai định dạng — TOKEN_INVALID', async () => {
      const res = await notificationAction.getNotificationRaw(
        'invalid.token.here',
        {
          index: 1,
          count: 10,
        },
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC13 — Token hết hạn — TOKEN_INVALID', async () => {
      const res = await notificationAction.getNotificationRaw(EXPIRED_TOKEN, {
        index: 1,
        count: 10,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });
});
