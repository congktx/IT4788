import { conversationAction } from '../../helpers/actions/conversation.action';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { failMsg } from '../../helpers/api-client.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;
let U2: TestUser;
let U3: TestUser;
let U4: TestUser;

beforeAll(async () => {
  [U1, U2, U3, U4] = getTestUsers();

  await conversationAction.sendMessage(U1.token, {
    to_id: String(U2.userId),
    message: 'Khởi tạo tin nhắn để đánh dấu đã đọc',
    type_message: 'text',
  });
});

// Thành công
describe('Thành công', () => {
  it('TC01 — Đánh dấu đã đọc với partner đang có conversation (user1 đọc tin từ user2)', async () => {
    const res = await conversationAction.setReadMessage(U1.token, {
      partner_id: String(U2.userId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
    expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
  });

  it('TC02 — Đánh dấu đã đọc khi chưa có conversation → vẫn trả OK (không lỗi)', async () => {
    const res = await conversationAction.setReadMessage(U3.token, {
      partner_id: String(U4.userId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
  });

  it('TC03 — Gọi set_read_message 2 lần liên tiếp → vẫn OK (idempotent)', async () => {
    await conversationAction.setReadMessage(U1.token, {
      partner_id: String(U2.userId),
    });
    const res = await conversationAction.setReadMessage(U1.token, {
      partner_id: String(U2.userId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
  });
});

// Thất bại -> Thiếu tham số
describe('Thiếu tham số', () => {
  it('TC04 — Không có token', async () => {
    const res = await conversationAction.setReadMessageRaw(null, {
      partner_id: String(U2.userId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
  });

  it('TC05 — Thiếu partner_id (có token)', async () => {
    const res = await conversationAction.setReadMessageRaw(U1.token, {});

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_NOT_ENOUGH.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Giá trị không hợp lệ
describe('Giá trị không hợp lệ', () => {
  it('TC06 — partner_id không tồn tại', async () => {
    const res = await conversationAction.setReadMessageRaw(U1.token, {
      partner_id: '999999',
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.USER_NOT_EXIST.code);
    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC07 — Tự đánh dấu đã đọc tin của chính mình (partner_id = currentUser)', async () => {
    const res = await conversationAction.setReadMessageRaw(U1.token, {
      partner_id: String(U1.userId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(
      RESPONSE.PARAMETER_VALUE_INVALID.code,
    );
    expect(res.body.data, failMsg(res)).toBeNull();
  });
});

// Thất bại -> Token không hợp lệ
describe('Token không hợp lệ', () => {
  it('TC08 — Token sai định dạng', async () => {
    const res = await conversationAction.setReadMessageRaw('bad.token', {
      partner_id: String(U2.userId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
  });

  it('TC09 — Token đã hết hạn', async () => {
    const res = await conversationAction.setReadMessageRaw(EXPIRED_TOKEN, {
      partner_id: String(U2.userId),
    });

    expect(res.status, failMsg(res)).toBe(200);
    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
  });
});
