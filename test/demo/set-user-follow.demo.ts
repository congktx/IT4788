/**
 * FILE: test/demo/set-user-follow.demo.ts
 *
 * MỤC ĐÍCH: Script demo để quan sát sự thay đổi DB sau mỗi bước.
 * KHÔNG phải test — không có expect(), không pass/fail.
 * Dùng để xem dữ liệu thay đổi trong DBeaver sau từng thao tác.
 *
 * CÁCH CHẠY:
 *   npx ts-node -r tsconfig-paths/register test/demo/set-user-follow.demo.ts
 *
 * ĐẶC ĐIỂM:
 *   - seedAll() chạy 1 lần lúc đầu
 *   - Sau mỗi bước: in response ra console + dừng chờ bạn nhấn Enter
 *   - Trong lúc dừng: mở DBeaver, xem bảng user_follows thay đổi
 *   - Sau bước cuối: clearAll() dọn sạch DB
 *
 * YÊU CẦU:
 *   - Docker MySQL đang chạy
 *   - DBeaver kết nối vào myapp_test (localhost:3307)
 */

import 'reflect-metadata';
import * as readline from 'readline';
import { NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import * as http from 'http';
import { testDataSourceOptions } from '../../data-source.test';
import { SeedHelper } from '../helpers/seed.helper';
import { UsersModule } from '../../src/modules/users/users.module';
import { AuthModule } from '../../src/common/auth/auth.module';
import { FollowModule } from '../../src/modules/follow/follow.module';
import { BlocksModule } from '../../src/modules/blocks/blocks.module';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Dừng chương trình, chờ người dùng nhấn Enter để tiếp tục
function waitForEnter(prompt: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`\n${prompt}\n>>> Nhấn Enter để tiếp tục...`, () => {
      rl.close();
      resolve();
    });
  });
}

// Gọi API bằng HTTP thủ công (không dùng supertest vì đây không phải test)
function callApi(
  server: http.Server,
  token: string | null,
  body: object,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: (server.address() as any).port,
      path: '/set_user_follow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode!, body: JSON.parse(body) });
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Tạo JWT token
function makeToken(userId: number, username: string): string {
  return jwt.sign(
    { sub: userId, username, role: 'user' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '1h' },
  );
}

// In response ra console với format đẹp
function logResponse(step: string, res: { status: number; body: any }) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📋 ${step}`);
  console.log(`HTTP Status: ${res.status}`);
  console.log(`Response body:`);
  console.log(JSON.stringify(res.body, null, 2));
  console.log(`${'─'.repeat(50)}`);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log('🚀 Khởi động demo set_user_follow...');

  // Khởi động NestJS app với DB test
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
      TypeOrmModule.forRoot(testDataSourceOptions),
      UsersModule,
      AuthModule,
      FollowModule,
      BlocksModule,
    ],
  }).compile();

  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  await app.listen(0); // port random để tránh conflict

  const server = app.getHttpServer();
  const dataSource = moduleRef.get(DataSource);
  const seed = new SeedHelper(dataSource);

  // ── SETUP ────────────────────────────────────
  console.log('\n⚙️  Đang dọn sạch và tạo dữ liệu ban đầu...');
  await seed.clearAll();
  await seed.seedAll();
  console.log(
    '✅ Đã tạo 5 users. user1 đang follow user2. user1 đã block user5.',
  );
  console.log(
    '💡 Mở DBeaver → myapp_test → xem bảng users, user_follows, user_blocks',
  );

  await waitForEnter('Bước 0: Xem dữ liệu ban đầu trong DBeaver');

  // ── BƯỚC 1: user2 follow user3 ───────────────
  const token2 = makeToken(2, 'user_2');
  const res1 = await callApi(server, token2, {
    followee_id: 3,
    action: 'follow',
  });
  logResponse('Bước 1: user2 FOLLOW user3', res1);
  console.log(
    '💡 Vào DBeaver xem bảng user_follows — sẽ thấy thêm 1 dòng mới (follower=2, followee=3)',
  );
  await waitForEnter('Bước 1 xong');

  // ── BƯỚC 2: user2 unfollow user3 ─────────────
  const res2 = await callApi(server, token2, {
    followee_id: 3,
    action: 'unfollow',
  });
  logResponse('Bước 2: user2 UNFOLLOW user3', res2);
  console.log(
    '💡 Vào DBeaver xem bảng user_follows — dòng (follower=2, followee=3) đã bị xóa',
  );
  await waitForEnter('Bước 2 xong');

  // ── BƯỚC 3: user2 follow user3 lại ───────────
  const res3 = await callApi(server, token2, {
    followee_id: 3,
    action: 'follow',
  });
  logResponse('Bước 3: user2 FOLLOW user3 lại', res3);
  console.log(
    '💡 Dòng (follower=2, followee=3) xuất hiện lại trong user_follows',
  );
  await waitForEnter('Bước 3 xong');

  // ── BƯỚC 4: user2 unfollow user3 lần 2 ───────
  const res4 = await callApi(server, token2, {
    followee_id: 3,
    action: 'unfollow',
  });
  logResponse('Bước 4: user2 UNFOLLOW user3 lần 2', res4);
  await waitForEnter('Bước 4 xong');

  // ── BƯỚC 5: Thử một số TH thất bại ──────────
  console.log('\n📌 Thử một số trường hợp thất bại để xem response...');

  const token1 = makeToken(1, 'user_1');

  const resFail1 = await callApi(server, token1, {
    followee_id: 1,
    action: 'follow',
  });
  logResponse('Thất bại: user1 tự follow chính mình', resFail1);

  const resFail2 = await callApi(server, token1, {
    followee_id: 2,
    action: 'follow',
  });
  logResponse('Thất bại: user1 follow user2 lần 2 (đã follow rồi)', resFail2);

  const resFail3 = await callApi(server, null, {
    followee_id: 2,
    action: 'follow',
  });
  logResponse('Thất bại: không có token', resFail3);

  await waitForEnter('Xem xong các TH thất bại');

  // ── CLEANUP ──────────────────────────────────
  console.log('\n🧹 Đang dọn sạch DB...');
  await seed.clearAll();
  console.log('✅ DB đã được reset về trạng thái rỗng');
  console.log('💡 Kiểm tra DBeaver — tất cả bảng đã rỗng');

  await app.close();
  console.log('\n✅ Demo hoàn thành!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
