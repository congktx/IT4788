import { followAction } from '../../helpers/actions/follow.action';
import { blockAction } from '../../helpers/actions/block.action';
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

// Đảm bảo dữ liệu sạch sau khi toàn bộ suite chạy xong
afterAll(async () => {
  await Promise.all([
    followAction.unfollow(U1.token, U2.userId).catch(() => {}),
    followAction.unfollow(U1.token, U3.userId).catch(() => {}),
    blockAction.unblock(U4.token, U1.userId).catch(() => {}),
    blockAction.unblock(U1.token, U5.userId).catch(() => {}),
  ]);
});

// Thành công
describe('Thành công', () => {
  afterEach(async () => {
    await followAction.unfollow(U1.token, U2.userId).catch(() => {});
  });

  it('TC01 — Follow hợp lệ — is_following=true, xuất hiện trong get_list_following và get_list_followed', async () => {
    const res = await followAction.follow(U1.token, U2.userId);

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(['OK', 'OK.'], failMsg(res)).toContain(res.body.message);
    expect(res.body.data.is_following, failMsg(res)).toBe(true);

    // Kiểm tra kiểu dữ liệu của received outcome
    expect(typeof res.body.data.followee_id, failMsg(res)).toBe('string');
    expect(typeof res.body.data.is_following, failMsg(res)).toBe('boolean');
    expect(typeof res.body.data.follow_count, failMsg(res)).toBe('number');
    expect(typeof res.body.data.following_count, failMsg(res)).toBe('number');

    expect(await followAction.isFollowing(U1.token, U1.userId, U2.userId)).toBe(
      true,
    );
    expect(await followAction.isFollowed(U2.token, U2.userId, U1.userId)).toBe(
      true,
    );
  });

  it('TC02 — Unfollow hợp lệ — is_following=false, biến mất khỏi get_list_following và get_list_followed', async () => {
    await followAction.follow(U1.token, U3.userId);

    const res = await followAction.unfollow(U1.token, U3.userId);

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(['OK', 'OK.'], failMsg(res)).toContain(res.body.message);
    expect(res.body.data.is_following, failMsg(res)).toBe(false);

    // Kiểm tra kiểu dữ liệu của received outcome
    expect(typeof res.body.data.followee_id, failMsg(res)).toBe('string');
    expect(typeof res.body.data.is_following, failMsg(res)).toBe('boolean');
    expect(typeof res.body.data.follow_count, failMsg(res)).toBe('number');
    expect(typeof res.body.data.following_count, failMsg(res)).toBe('number');

    expect(await followAction.isFollowing(U1.token, U1.userId, U3.userId)).toBe(
      false,
    );
    expect(await followAction.isFollowed(U3.token, U3.userId, U1.userId)).toBe(
      false,
    );
  });

  it('TC03 — Follow rồi unfollow — following_count giảm đúng 1', async () => {
    const followRes = await followAction.follow(U1.token, U3.userId);
    expect(followRes.body.code, failMsg(followRes)).toBe(RESPONSE.OK.code);
    expect(['OK', 'OK.'], failMsg(followRes)).toContain(
      followRes.body.message,
    );
    const countAfterFollow = followRes.body.data.following_count;

    const unfollowRes = await followAction.unfollow(U1.token, U3.userId);
    expect(unfollowRes.body.code, failMsg(unfollowRes)).toBe(RESPONSE.OK.code);
    expect(['OK', 'OK.'], failMsg(unfollowRes)).toContain(
      unfollowRes.body.message,
    );
    const countAfterUnfollow = unfollowRes.body.data.following_count;

    expect(countAfterUnfollow, failMsg(unfollowRes)).toBe(countAfterFollow - 1);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC04 — Không có token — TOKEN_INVALID', async () => {
    const res = await followAction.raw(null, {});
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC05 — Có token, thiếu followee_id và action — PARAMETER_NOT_ENOUGH', async () => {
    const res = await followAction.raw(U1.token, {});
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC06 — Có token, có action, thiếu followee_id — PARAMETER_NOT_ENOUGH', async () => {
    const res = await followAction.raw(U1.token, { action: 'follow' });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC07 — Có token, có followee_id, thiếu action — PARAMETER_NOT_ENOUGH', async () => {
    const res = await followAction.raw(U1.token, { followee_id: U2.userId });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC08 — Không có token, có followee_id và action — TOKEN_INVALID', async () => {
    const res = await followAction.raw(null, {
      followee_id: U2.userId,
      action: 'follow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Sai kiểu dữ liệu
describe('Sai kiểu hoặc giá trị tham số', () => {
  it('TC09 — followee_id là số nguyên — USER_NOT_EXIST (server convert được sang number nhưng không tìm thấy)', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: 123,
      action: 'follow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.USER_NOT_EXIST.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC10 — followee_id là chuỗi không hợp lệ ("abc") — PARAMETER_TYPE_INVALID', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: 'abc',
      action: 'follow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_TYPE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_TYPE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC11 — followee_id là chuỗi rỗng — PARAMETER_VALUE_INVALID', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: '',
      action: 'follow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC12 — action không hợp lệ ("like") — PARAMETER_VALUE_INVALID', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: U2.userId,
      action: 'like',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC13 — action là chuỗi rỗng — PARAMETER_VALUE_INVALID', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: U2.userId,
      action: '',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC14 — Token sai định dạng — TOKEN_INVALID', async () => {
    const res = await followAction.raw('not.a.valid.token', {
      followee_id: U2.userId,
      action: 'follow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC15 — Token hết hạn — TOKEN_INVALID', async () => {
    const res = await followAction.raw(EXPIRED_TOKEN, {
      followee_id: U2.userId,
      action: 'follow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Lỗi nghiệp vụ
describe('Lỗi nghiệp vụ', () => {
  beforeAll(async () => {
    await Promise.all([
      blockAction.block(U4.token, U1.userId),
      blockAction.block(U1.token, U5.userId),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      followAction.unfollow(U1.token, U3.userId).catch(() => {}),
      blockAction.unblock(U4.token, U1.userId).catch(() => {}),
      blockAction.unblock(U1.token, U5.userId).catch(() => {}),
    ]);
  });

  it('TC16 — followee_id không tồn tại, action=follow — USER_NOT_EXIST', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: '999999',
      action: 'follow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.USER_NOT_EXIST.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC17 — followee_id không tồn tại, action=unfollow — USER_NOT_EXIST', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: '999999',
      action: 'unfollow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.USER_NOT_EXIST.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC18 — Tự follow chính mình — PARAMETER_VALUE_INVALID', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: U1.userId,
      action: 'follow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC19 — Tự unfollow chính mình — PARAMETER_VALUE_INVALID', async () => {
    const res = await followAction.raw(U1.token, {
      followee_id: U1.userId,
      action: 'unfollow',
    });
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC20 — Follow người đã follow — ACTION_DONE_PREVIOUSLY', async () => {
    await followAction.follow(U1.token, U3.userId);

    const res = await followAction.follow(U1.token, U3.userId);
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.ACTION_DONE_PREVIOUSLY.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.ACTION_DONE_PREVIOUSLY.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC21 — Unfollow người chưa follow — ACTION_DONE_PREVIOUSLY', async () => {
    const res = await followAction.unfollow(U1.token, U2.userId);
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.ACTION_DONE_PREVIOUSLY.code,
    );
    expect(res.body.message, failMsg(res)).toBe(
      RESPONSE.ACTION_DONE_PREVIOUSLY.message,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC22 — Follow user đã block mình — NOT_ACCESS', async () => {
    const res = await followAction.follow(U1.token, U4.userId);
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC23 — Unfollow user đã block mình — NOT_ACCESS', async () => {
    const res = await followAction.unfollow(U1.token, U4.userId);
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC24 — Follow user mình đã block — NOT_ACCESS', async () => {
    const res = await followAction.follow(U1.token, U5.userId);
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC25 — Unfollow user mình đã block — NOT_ACCESS', async () => {
    const res = await followAction.unfollow(U1.token, U5.userId);
    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.NOT_ACCESS.message);
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
