/**
 * FILE: test/demo/set-user-block.demo.ts
 *
 * MỤC ĐÍCH: Script demo để quan sát sự thay đổi DB sau mỗi bước block/unblock.
 * KHÔNG phải test — không có expect(), không pass/fail.
 * Dùng để xem dữ liệu thay đổi trong DBeaver sau từng thao tác.
 *
 * CÁCH CHẠY:
 *   npx ts-node -r tsconfig-paths/register test/demo/set-user-block.demo.ts
 *
 * HOẶC dùng script trong package.json:
 *   npm run demo (chọn số 2 từ menu)
 *
 * YÊU CẦU:
 *   - Docker MySQL đang chạy (docker-compose up -d)
 *   - DBeaver kết nối vào myapp_test (localhost:3307)
 *   - Mở sẵn 3 bảng trong DBeaver: users, user_follows, user_blocks
 *
 * KỊCH BẢN DEMO:
 *   Bước 0: Xem dữ liệu ban đầu
 *   Bước 1: user1 block user2 → user_blocks thêm 1 dòng, user_follows mất 2 dòng
 *   Bước 2: user3 block user1 → user_blocks thêm 1 dòng nữa
 *   Bước 3: user1 unblock user2 → user_blocks mất 1 dòng
 *   Bước 4: Thử các TH thất bại → DB không thay đổi
 */

import 'reflect-metadata';
import * as readline from 'readline';
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
    rl.question(`\n📌 ${prompt}\n>>> Nhấn Enter để tiếp tục...`, () => {
      rl.close();
      resolve();
    });
  });
}

// Gọi API bằng HTTP
function callApi(
  server: http.Server,
  path: string,
  token: string | null,
  body: object,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: (server.address() as any).port,
      path,
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
  const icon = res.body.code === '1000' ? '✅' : '❌';
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`${icon} ${step}`);
  console.log(`   HTTP Status : ${res.status}`);
  console.log(`   code        : ${res.body.code}`);
  console.log(`   message     : ${res.body.message}`);
  console.log(`   data        : ${JSON.stringify(res.body.data)}`);
  console.log(`${'─'.repeat(55)}`);
}

// In hướng dẫn xem DB
function logDbHint(tables: string[]) {
  console.log(`\n💡 Mở DBeaver → myapp_test → xem bảng: ${tables.join(', ')}`);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Khởi động demo set_user_block...');
  console.log('   Đang kết nối DB và khởi động NestJS app...\n');

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
  await app.listen(0); // port random

  const server = app.getHttpServer();
  const dataSource = moduleRef.get(DataSource);
  const seed = new SeedHelper(dataSource);

  // ── SETUP ─────────────────────────────────
  console.log('⚙️  Đang tạo dữ liệu ban đầu...');
  await seed.clearAll();
  await seed.seedAll();
  // seedAll tạo: 5 users, user1 follow user2, user1 block user5

  // Tạo thêm: user2 follow user1 (để demo block xóa follow 2 chiều)
  const followRepo = dataSource.getRepository('user_follows' as any);
  await dataSource.query(
    'INSERT INTO user_follows (follower_id, followee_id) VALUES (2, 1)',
  );

  console.log('✅ Dữ liệu ban đầu:');
  console.log('   - 5 users (id: 1,2,3,4,5)');
  console.log('   - user1 đang FOLLOW user2');
  console.log('   - user2 đang FOLLOW user1 (chiều ngược lại)');
  console.log('   - user1 đã BLOCK user5');

  logDbHint(['users', 'user_follows', 'user_blocks']);
  await waitForEnter('Bước 0: Xem dữ liệu ban đầu');

  // ── BƯỚC 1: user1 block user2 ─────────────
  // Kết quả mong đợi:
  //   - user_blocks: thêm dòng (blocker=1, blocked=2)
  //   - user_follows: XÓA (1→2) và (2→1) vì block tự xóa follow 2 chiều
  const token1 = makeToken(1, 'user_1');

  const res1 = await callApi(server, '/set_user_block', token1, {
    user_id: 2,
    type: 0, // 0 = block
  });
  logResponse('Bước 1: user1 BLOCK user2 (type=0)', res1);
  console.log('   📊 Thay đổi DB mong đợi:');
  console.log('      user_blocks  : thêm 1 dòng (blocker_id=1, blocked_id=2)');
  console.log('      user_follows : MẤT 2 dòng (1→2 và 2→1 bị xóa tự động)');
  logDbHint(['user_blocks', 'user_follows']);
  await waitForEnter('Bước 1 xong — kiểm tra DB');

  // ── BƯỚC 2: user3 block user1 ─────────────
  // Kết quả mong đợi:
  //   - user_blocks: thêm dòng (blocker=3, blocked=1)
  //   - user_follows: không thay đổi (user3 và user1 không có follow nhau)
  const token3 = makeToken(3, 'user_3');

  const res2 = await callApi(server, '/set_user_block', token3, {
    user_id: 1,
    type: 0, // 0 = block
  });
  logResponse('Bước 2: user3 BLOCK user1 (type=0)', res2);
  console.log('   📊 Thay đổi DB mong đợi:');
  console.log('      user_blocks  : thêm 1 dòng (blocker_id=3, blocked_id=1)');
  console.log(
    '      user_follows : không đổi (user3 và user1 không follow nhau)',
  );
  logDbHint(['user_blocks']);
  await waitForEnter('Bước 2 xong — kiểm tra DB');

  // ── BƯỚC 3: user1 unblock user2 ───────────
  // Kết quả mong đợi:
  //   - user_blocks: XÓA dòng (blocker=1, blocked=2)
  //   - user_follows: không đổi (unblock không tự tạo lại follow)
  const res3 = await callApi(server, '/set_user_block', token1, {
    user_id: 2,
    type: 1, // 1 = unblock
  });
  logResponse('Bước 3: user1 UNBLOCK user2 (type=1)', res3);
  console.log('   📊 Thay đổi DB mong đợi:');
  console.log(
    '      user_blocks  : MẤT 1 dòng (blocker_id=1, blocked_id=2 bị xóa)',
  );
  console.log('      user_follows : không đổi (unblock KHÔNG tạo lại follow)');
  logDbHint(['user_blocks', 'user_follows']);
  await waitForEnter('Bước 3 xong — kiểm tra DB');

  // ── BƯỚC 4: Các TH thất bại ───────────────
  // Kết quả mong đợi: DB không thay đổi sau bất kỳ TH nào dưới đây
  console.log(
    '\n📌 Bước 4: Thử các trường hợp thất bại — DB sẽ KHÔNG thay đổi',
  );

  const resFail1 = await callApi(server, '/set_user_block', token1, {
    user_id: 1, // tự block chính mình
    type: 0,
  });
  logResponse('Thất bại: user1 tự BLOCK chính mình', resFail1);

  const resFail2 = await callApi(server, '/set_user_block', token1, {
    user_id: 5, // đã block user5 rồi (seedAll tạo sẵn)
    type: 0,
  });
  logResponse('Thất bại: user1 BLOCK user5 lần 2 (đã block rồi)', resFail2);

  const resFail3 = await callApi(server, '/set_user_block', token1, {
    user_id: 3, // user1 chưa block user3 bao giờ
    type: 1, // unblock → thất bại vì chưa block
  });
  logResponse('Thất bại: user1 UNBLOCK user3 (chưa block)', resFail3);

  const resFail4 = await callApi(server, '/set_user_block', token1, {
    user_id: 999999, // user không tồn tại
    type: 0,
  });
  logResponse('Thất bại: block user không tồn tại (id=999999)', resFail4);

  const resFail5 = await callApi(server, '/set_user_block', token1, {
    user_id: 2,
    type: 2, // type không hợp lệ (chỉ có 0 hoặc 1)
  });
  logResponse('Thất bại: type = 2 (không hợp lệ)', resFail5);

  logDbHint(['user_blocks']);
  await waitForEnter('Bước 4 xong — kiểm tra DB (phải giống Bước 3)');

  // ── CLEANUP ───────────────────────────────
  console.log('\n🧹 Đang dọn sạch DB...');
  await seed.clearAll();
  console.log('✅ DB đã được reset về trạng thái rỗng');
  logDbHint(['user_blocks', 'user_follows', 'users']);

  await app.close();
  console.log('\n✅ Demo hoàn thành!\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
