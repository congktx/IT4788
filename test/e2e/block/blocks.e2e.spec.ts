import { blockAction } from '../../helpers/actions/block.action';
import { followAction } from '../../helpers/actions/follow.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;
let U4: TestUser;
let U5: TestUser;

beforeAll(() => {
  [U1, U2, U3, U4, U5] = getTestUsers();
});

// Dọn dẹp phòng hờ rác từ các Suite khác
afterAll(async () => {
  await Promise.all([
    blockAction.unblock(U1.token, U2.userId).catch(() => {}),
    blockAction.unblock(U2.token, U1.userId).catch(() => {}),
    blockAction.unblock(U1.token, U5.userId).catch(() => {}),
    blockAction.unblock(U2.token, U3.userId).catch(() => {}),
    followAction.unfollow(U1.token, U2.userId).catch(() => {}),
    followAction.unfollow(U2.token, U1.userId).catch(() => {}),
  ]);
});

describe('POST /set_user_block', () => {
  describe('Trường hợp thành công', () => {
    afterEach(async () => {
      await Promise.all([
        blockAction.unblock(U2.token, U3.userId).catch(() => {}),
        blockAction.unblock(U1.token, U2.userId).catch(() => {}),
        blockAction.unblock(U1.token, U5.userId).catch(() => {}),
      ]);
    });

    it('TC01 — Block một người (type=0), data trả về null', async () => {
      const res = await blockAction.block(U2.token, U3.userId);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(['OK', 'OK.'], failMsg(res)).toContain(res.body.message);
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC02 — Block xóa follow 2 chiều: A follow B + B follow A → block → cả 2 bị xóa', async () => {
      // Setup: 2 người follow nhau
      await followAction.follow(U1.token, U2.userId);
      await followAction.follow(U2.token, U1.userId);

      // Action: U1 block U2
      const res = await blockAction.block(U1.token, U2.userId);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

      // Verify: Mối quan hệ follow bị chấm dứt hoàn toàn
      expect(
        await followAction.isFollowing(U1.token, U1.userId, U2.userId),
      ).toBe(false);
      expect(
        await followAction.isFollowing(U2.token, U2.userId, U1.userId),
      ).toBe(false);
    });

    it('TC03 — Unblock một người (type=1)', async () => {
      // Setup: Block trước
      await blockAction.block(U1.token, U5.userId);

      // Action: Unblock
      const res = await blockAction.unblock(U1.token, U5.userId);

      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
      expect(['OK', 'OK.'], failMsg(res)).toContain(res.body.message);
      expect(res.body.data, failMsg(res)).toBeNull();
    });
  });

  describe('Thất bại — thiếu tham số', () => {
    it('TC04 — Bỏ trống cả 3: user_id, type, token', async () => {
      const res = await blockAction.raw(null, {});
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC05 — Bỏ trống user_id và type (có token)', async () => {
      const res = await blockAction.raw(U1.token, {});
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
      expect(res.body.message, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.message,
      );
      expect(res.body.data, failMsg(res)).toBeNull();
    });

    it('TC06 — Bỏ trống user_id và token', async () => {
      const res = await blockAction.raw(null, { type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC07 — Bỏ trống type và token', async () => {
      const res = await blockAction.raw(null, { user_id: U2.userId });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC08 — Bỏ trống user_id (có token, có type)', async () => {
      const res = await blockAction.raw(U1.token, { type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC09 — Bỏ trống type (có token, có user_id)', async () => {
      const res = await blockAction.raw(U1.token, { user_id: U2.userId });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_NOT_ENOUGH.code,
      );
    });

    it('TC10 — Bỏ trống token (có user_id, có type)', async () => {
      const res = await blockAction.raw(null, { user_id: U2.userId, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });

  describe('Thất bại — sai kiểu dữ liệu user_id', () => {
    it('TC11 — user_id là chuỗi không phải số ("abc")', async () => {
      const res = await blockAction.raw(U1.token, { user_id: 'abc', type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC12 — user_id là số thực (1.5)', async () => {
      const res = await blockAction.raw(U1.token, { user_id: 1.5, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });

    it('TC13 — user_id là số âm (-1)', async () => {
      const res = await blockAction.raw(U1.token, { user_id: -1, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC14 — user_id = 0', async () => {
      const res = await blockAction.raw(U1.token, { user_id: 0, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });
  });

  describe('Thất bại — type không hợp lệ', () => {
    it('TC15 — type = 2 (không phải 0 hoặc 1)', async () => {
      const res = await blockAction.raw(U1.token, {
        user_id: U2.userId,
        type: 2,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC16 — type là string ("block" thay vì số)', async () => {
      const res = await blockAction.raw(U1.token, {
        user_id: U2.userId,
        type: 'block',
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_TYPE_INVALID.code,
      );
    });
  });

  describe('Thất bại — token không hợp lệ', () => {
    it('TC17 — Token sai định dạng', async () => {
      const res = await blockAction.raw('invalid.token.here', {
        user_id: U2.userId,
        type: 0,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });

    it('TC18 — Token đã hết hạn', async () => {
      const res = await blockAction.raw(EXPIRED_TOKEN, {
        user_id: U2.userId,
        type: 0,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    });
  });

  describe('Thất bại — nghiệp vụ', () => {
    // UNDO triệt để
    afterEach(async () => {
      await blockAction.unblock(U1.token, U5.userId).catch(() => {});
      await blockAction.unblock(U2.token, U3.userId).catch(() => {});
    });

    it('TC19 — user_id không tồn tại, type = 0 (block)', async () => {
      const res = await blockAction.raw(U1.token, { user_id: 999999, type: 0 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
    });

    it('TC20 — user_id không tồn tại, type = 1 (unblock)', async () => {
      const res = await blockAction.raw(U1.token, { user_id: 999999, type: 1 });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
    });

    it('TC21 — Tự block chính mình', async () => {
      const res = await blockAction.raw(U1.token, {
        user_id: U1.userId,
        type: 0,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC22 — Tự unblock chính mình', async () => {
      const res = await blockAction.raw(U1.token, {
        user_id: U1.userId,
        type: 1,
      });
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.PARAMETER_VALUE_INVALID.code,
      );
    });

    it('TC23 — Block người đã block rồi', async () => {
      await blockAction.block(U1.token, U5.userId);

      const res = await blockAction.block(U1.token, U5.userId);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.code,
      );
    });

    it('TC24 — Unblock người chưa block', async () => {
      const res = await blockAction.unblock(U2.token, U3.userId);
      expect(res.status, failMsg(res)).toBe(200);
      expect(res.body.code, failMsg(res)).toBe(
        RESPONSE.ACTION_DONE_PREVIOUSLY.code,
      );
    });
  });
});
