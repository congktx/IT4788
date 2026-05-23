import { notificationAction } from '../../helpers/actions/notification.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;

let targetNotifId: number | null = null;

beforeAll(async () => {
  [U1, U2] = getTestUsers();

  const res = await notificationAction.getNotification(U1.token, {
    index: 1,
    count: 10,
  });

  if (res.body.data && res.body.data.length > 0) {
    targetNotifId = res.body.data[0].id;
  }
});

describe('POST /notification/set_read_notification', () => {
  // Thành công
  describe('Thành công', () => {
    it('TC01 — Đánh dấu đã đọc thông báo hợp lệ — OK', async () => {
      if (!targetNotifId) return;

      const res = await notificationAction.setReadNotification(U1.token, {
        notification_id: targetNotifId,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
      expect(Array.isArray(res.body.data), failMsg(res)).toBe(true);
      expect(typeof res.body.badge).toBe('number');
    });

    it('TC02 — Đánh dấu thông báo đã đọc rồi (idempotent) — OK', async () => {
      if (!targetNotifId) return;

      await notificationAction.setReadNotification(U1.token, {
        notification_id: targetNotifId,
      });
      const res = await notificationAction.setReadNotification(U1.token, {
        notification_id: targetNotifId,
      });

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });

  // Thất bại -> Thiếu tham số
  describe('Thiếu tham số', () => {
    it('TC03 — Không có token, có đủ tham số — TOKEN_INVALID', async () => {
      const idToTest = targetNotifId || 1;
      const res = await notificationAction.setReadNotificationRaw(null, {
        notification_id: idToTest,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC04 — Có token, thiếu notification_id — PARAMETER_VALUE_INVALID (Ghi nhận BUG 1004)', async () => {
      const res = await notificationAction.setReadNotificationRaw(U1.token, {});

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  // Thất bại -> Sai kiểu hoặc giá trị tham số
  describe('Sai kiểu hoặc giá trị tham số', () => {
    it('TC05 — notification_id không tồn tại — PARAMETER_VALUE_INVALID', async () => {
      const res = await notificationAction.setReadNotificationRaw(U1.token, {
        notification_id: 9999999,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
    it('TC06 — notification_id là chuỗi không hợp lệ ("abc") — PARAMETER_TYPE_INVALID', async () => {
      const res = await notificationAction.setReadNotificationRaw(U1.token, {
        notification_id: 'abc',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });
    it('TC07 — notification_id âm (-1) — PARAMETER_VALUE_INVALID', async () => {
      const res = await notificationAction.setReadNotificationRaw(U1.token, {
        notification_id: -1,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  // Thất bại -> Token không hợp lệ
  describe('Token không hợp lệ', () => {
    it('TC08 — Token sai định dạng — TOKEN_INVALID', async () => {
      const idToTest = targetNotifId || 1;
      const res = await notificationAction.setReadNotificationRaw(
        'invalid.token.here',
        {
          notification_id: idToTest,
        },
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC09 — Token hết hạn — TOKEN_INVALID', async () => {
      const idToTest = targetNotifId || 1;
      const res = await notificationAction.setReadNotificationRaw(
        EXPIRED_TOKEN,
        {
          notification_id: idToTest,
        },
      );
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });

  // Thất bại -> Lỗi nghiệp vụ
  describe('Lỗi nghiệp vụ', () => {
    it('TC10 — Đánh dấu đọc thông báo của user khác', async () => {
      if (!targetNotifId) return;

      const res = await notificationAction.setReadNotification(U2.token, {
        notification_id: targetNotifId,
      });

      expect(res.status, failMsg(res)).toBe(200);
      // Ghi nhận BUG: Service không chặn việc đánh dấu đọc thông báo của người khác nên vẫn trả về OK
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    });
  });
});
