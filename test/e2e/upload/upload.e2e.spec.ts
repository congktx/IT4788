import { uploadAction } from '../../helpers/actions/upload.action';
import { failMsg, UploadFileFixture } from '../../helpers/api-client.helper';
import { getTestUsers, TestUser } from '../../helpers/test-user.helper';
import { RESPONSE } from '../../constants/respones';
import { EXPIRED_TOKEN } from '../../fixtures/user.fixture';

let U1: TestUser;

const FIXTURES: Record<string, UploadFileFixture> = {
  png: {
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    ),
    filename: 'test-image.png',
    mimetype: 'image/png',
  },

  jpeg: {
    buffer: Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=',
      'base64',
    ),
    filename: 'test-image.jpg',
    mimetype: 'image/jpeg',
  },

  pdf: {
    buffer: Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF',
    ),
    filename: 'test-document.pdf',
    mimetype: 'application/pdf',
  },

  txt: {
    buffer: Buffer.from('Hello, this is a plain text file for testing.'),
    filename: 'test-file.txt',
    mimetype: 'text/plain',
  },

  exe: {
    buffer: Buffer.from('MZ\x90\x00'),
    filename: 'malicious.exe',
    mimetype: 'application/octet-stream',
  },

  empty: {
    buffer: Buffer.from(''),
    filename: 'empty.txt',
    mimetype: 'text/plain',
  },

  spaced: {
    buffer: Buffer.from('content'),
    filename: 'my file name.txt',
    mimetype: 'text/plain',
  },
};

beforeAll(() => {
  [U1] = getTestUsers();
});

function expectUploadSuccess(res: any) {
  expect(res.status, failMsg(res)).toBe(201);

  expect(res.body.code, failMsg(res)).toBe(RESPONSE.OK.code);

  expect(res.body.message, failMsg(res)).toBe(RESPONSE.OK.message);

  expect(res.body.data, failMsg(res)).toBeDefined();

  expect(res.body.data.url, failMsg(res)).toEqual(expect.any(String));

  expect(res.body.data.url, failMsg(res)).toMatch(/^https?:\/\//);
}

// Thành công
describe('Thành công', () => {
  it('TC01 — Upload file PNG hợp lệ — trả về URL', async () => {
    const res = await uploadAction.uploadFile(U1.token, FIXTURES.png);

    expectUploadSuccess(res);
  });

  it('TC02 — Upload file JPEG hợp lệ — trả về URL', async () => {
    const res = await uploadAction.uploadFile(U1.token, FIXTURES.jpeg);

    expectUploadSuccess(res);
  });

  it('TC03 — Upload file PDF — upload thành công', async () => {
    const res = await uploadAction.uploadFile(U1.token, FIXTURES.pdf);

    expectUploadSuccess(res);
  });

  it('TC04 — Upload file TXT — upload thành công', async () => {
    const res = await uploadAction.uploadFile(U1.token, FIXTURES.txt);

    expectUploadSuccess(res);
  });

  it('TC05 — Upload file EXE — upload thành công', async () => {
    const res = await uploadAction.uploadFile(U1.token, FIXTURES.exe);

    expectUploadSuccess(res);
  });

  it('TC06 — Upload file rỗng — upload thành công', async () => {
    const res = await uploadAction.uploadFile(U1.token, FIXTURES.empty);

    expectUploadSuccess(res);
  });

  it('TC07 — Upload cùng file nhiều lần — URL khác nhau', async () => {
    const res1 = await uploadAction.uploadFile(U1.token, FIXTURES.txt);

    const res2 = await uploadAction.uploadFile(U1.token, FIXTURES.txt);

    expectUploadSuccess(res1);
    expectUploadSuccess(res2);

    expect(res1.body.data.url).not.toBe(res2.body.data.url);
  });

  it('TC08 — Filename có khoảng trắng — được replace bằng "-"', async () => {
    const res = await uploadAction.uploadFile(U1.token, FIXTURES.spaced);

    expectUploadSuccess(res);

    expect(res.body.data.url, failMsg(res)).toContain('my-file-name.txt');

    expect(res.body.data.url, failMsg(res)).not.toContain(' ');
  });
});

// Thất bại — thiếu file
describe('Thất bại — thiếu file', () => {
  it('TC09 — Không gửi file — trả lỗi', async () => {
    const res = await uploadAction.uploadNoFile(U1.token);

    expect(res.status, failMsg(res)).toBe(200);

    expect(res.body.code, failMsg(res)).toBe(RESPONSE.UNKNOWN_ERROR.code);
  });

  it('TC10 — Sai field name của file — trả lỗi', async () => {
    const res = await uploadAction.uploadFileRaw(
      U1.token,
      FIXTURES.png,
      'image',
    );

    expect(res.status, failMsg(res)).toBe(200);

    expect(res.body.code, failMsg(res)).toBe(RESPONSE.UNKNOWN_ERROR.code);
  });
});

// Thất bại — token không hợp lệ
describe('Thất bại — token không hợp lệ', () => {
  it('TC11 — Không có token — TOKEN_INVALID', async () => {
    const res = await uploadAction.uploadFileRaw(null, FIXTURES.png);

    expect(res.status, failMsg(res)).toBe(200);

    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);

    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);

    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC12 — Token sai định dạng — TOKEN_INVALID', async () => {
    const res = await uploadAction.uploadFileRaw(
      'invalid.token.here',
      FIXTURES.png,
    );

    expect(res.status, failMsg(res)).toBe(200);

    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);

    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);

    expect(res.body.data, failMsg(res)).toBeNull();
  });

  it('TC13 — Token hết hạn — TOKEN_INVALID', async () => {
    const res = await uploadAction.uploadFileRaw(EXPIRED_TOKEN, FIXTURES.png);

    expect(res.status, failMsg(res)).toBe(200);

    expect(res.body.code, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.code);

    expect(res.body.message, failMsg(res)).toBe(RESPONSE.TOKEN_INVALID.message);

    expect(res.body.data, failMsg(res)).toBeNull();
  });
});
