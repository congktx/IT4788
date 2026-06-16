import * as fs from 'fs';
import * as path from 'path';
import { api } from '../helpers/api-client.helper';
import { USER_FIXTURES } from '../fixtures/user.fixture';
import { TestUser } from '../helpers/test-user.helper';

const OUTPUT = path.resolve(__dirname, '../.test-users.json');

async function login(phone: string, password: string) {
  const res = await api.post('/auth/login', {
    phone_number: phone,
    password,
  });

  if (res.body.code !== '1000') return null;

  return {
    phone,
    token: res.body.data.token,
    userId: res.body.data.id,
  };
}

async function signup(fixture: (typeof USER_FIXTURES)[number]) {
  const res = await api.post('/auth/signup', {
    phone_number: fixture.phone_number,
    password: fixture.password,
    uuid: fixture.uuid,
  });

  if (res.body.code !== '1000') return null;

  // Login ngay sau signup để lấy token
  return await login(fixture.phone_number, fixture.password);
}

export default async function globalSetup() {
  console.log('\n Preparing test users...');

  const users: TestUser[] = [];

  for (const fixture of USER_FIXTURES) {
    // Thử login trước — user đã tồn tại
    let user = await login(fixture.phone_number, fixture.password);

    // Nếu login thất bại → signup lần đầu
    if (!user) {
      console.log(`Signing up: ${fixture.phone_number}`);
      user = await signup(fixture);
    } else {
      console.log(`Logged in: ${fixture.phone_number}`);
    }

    if (!user) {
      throw new Error(`Không thể login hoặc signup: ${fixture.phone_number}`);
    }

    users.push(user);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(users, null, 2));
  console.log('globalSetup done\n');
}
