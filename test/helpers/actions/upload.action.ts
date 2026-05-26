import { api } from '../api-client.helper';
import { UploadFileFixture } from '../api-client.helper';

export const uploadAction = {
  uploadFile: (token: string, file: UploadFileFixture) =>
    api.upload('/upload/file', file, token),

  uploadNoFile: (token: string) => api.upload('/upload/file', null, token),

  uploadFileRaw: (
    token: string | null,
    file: UploadFileFixture | null = null,
    fieldName = 'file',
  ) => api.upload('/upload/file', file, token, fieldName),
};
