import * as fs from 'fs';
import * as path from 'path';

export interface TestUser {
  phone: string;
  token: string;
  userId: string;
}

const FILE_PATH = path.resolve(__dirname, '../.test-users.json');

export function getTestUsers(): TestUser[] {
  if (!fs.existsSync(FILE_PATH)) {
    throw new Error(
      'File .test-users.json không tồn tại.\n' + 'Hãy chạy globalSetup trước.',
    );
  }

  return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
}
