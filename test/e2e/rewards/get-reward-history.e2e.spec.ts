// import { rewardsAction } from '../../helpers/actions/rewards.action';
// import { failMsg } from '../../helpers/api-client.helper';
// import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
// import { RESPONSE } from '../../constants/respones';
// import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

// let U1: TestUser;

// beforeAll(() => {
//   [U1] = getTestUsers();
// });

// // Thành công
// describe('Thành công', () => {
//   it('TC01 — Tham số phân trang hợp lệ — trả về mã 1000 và mảng lịch sử phần thưởng', async () => {
//     const payload = {
//       index: 1,
//       count: 10,
//     };

//     const res = await rewardsAction.getHistory(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);
//     expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);
//     expect(res.body.data, failMsg(res)).toBeInstanceOf(Array);
//   });
// });

// // Thất bại — sai tham số đầu vào
// describe('Thất bại — sai tham số đầu vào', () => {
//   it('TC02 — Thiếu tham số phân trang — trả lỗi PARAMETER_NOT_ENOUGH', async () => {
//     const payload = {};

//     const res = await rewardsAction.getHistory(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(
//       RESPONSE.PARAMETER_NOT_ENOUGH.code,
//     );
//   });

//   it('TC03 — Kiểu dữ liệu tham số không hợp lệ (chuỗi thay vì số) — trả lỗi PARAMETER_TYPE_INVALID', async () => {
//     const payload = {
//       index: 'abc',
//       count: 'xyz',
//     };

//     const res = await rewardsAction.getHistory(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(
//       RESPONSE.PARAMETER_TYPE_INVALID.code,
//     );
//   });

//   it('TC04 — Giá trị phân trang là số âm hoặc bằng 0 — trả lỗi PARAMETER_VALUE_INVALID', async () => {
//     const payload = {
//       index: -1,
//       count: 0,
//     };

//     const res = await rewardsAction.getHistory(U1.token, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(
//       RESPONSE.PARAMETER_VALUE_INVALID.code,
//     );
//   });
// });

// // Thất bại — token không hợp lệ
// describe('Thất bại — token không hợp lệ', () => {
//   it('TC05 — Không gửi kèm token Authorization — trả lỗi TOKEN_INVALID', async () => {
//     const payload = { index: 1, count: 10 };
//     const res = await rewardsAction.getHistoryRaw(null, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
//     expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);
//   });

//   it('TC06 — Token sai cấu trúc định dạng — trả lỗi TOKEN_INVALID', async () => {
//     const payload = { index: 1, count: 10 };
//     const res = await rewardsAction.getHistoryRaw(
//       'invalid.token.structure',
//       payload,
//     );

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
//   });

//   it('TC07 — Token hết hạn — trả lỗi TOKEN_INVALID', async () => {
//     const payload = { index: 1, count: 10 };
//     const res = await rewardsAction.getHistoryRaw(EXPIRED_TOKEN, payload);

//     expect(res.status, failMsg(res)).toBe(200);
//     expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);
//   });
// });
