import request from 'supertest';

export interface UploadFileFixture {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

const BASE_URL =
  process.env.BASE_URL ||
  'https://adware-merely-andrews-home.trycloudflare.com';

export const api = {
  get: (path: string, token?: string | null) => {
    const req = request(BASE_URL).get(path);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  post: (path: string, body: object, token?: string | null) => {
    const req = request(BASE_URL).post(path).send(body);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  patch: (path: string, body: object, token?: string | null) => {
    const req = request(BASE_URL).patch(path).send(body);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  delete: (path: string, token?: string | null) => {
    const req = request(BASE_URL).delete(path);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  upload: (
    url: string,
    file: UploadFileFixture | null,
    token?: string | null,
    fieldName = 'file',
  ) => {
    const req = request(BASE_URL).post(url);

    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }

    if (file) {
      req.attach(fieldName, file.buffer, {
        filename: file.filename,
        contentType: file.mimetype,
      });
    }
    return req;
  },
};

export function failMsg(res: any): string {
  return (
    `\nFull response: ${JSON.stringify(res.body, null, 2)}\n` +
    `  code:    ${res.body?.code}\n` +
    `  message: ${res.body?.message}`
  );
}
