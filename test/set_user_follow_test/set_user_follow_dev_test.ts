import { runApiIntegrationTest, TestMode } from './set_user_follow_test';
//import { setUserFollow } from '../services/set_user_follow'; // API thật
import * as readline from 'readline';

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Chọn chế độ chạy test:');
  console.log('1. Full run (chạy hết tất cả testcase)');
  console.log('2. Strict (gặp fail dừng ngay)');

  const mode: TestMode = await new Promise((resolve) => {
    rl.question('Nhập 1 hoặc 2: ', (answer) => {
      rl.close();
      resolve(answer === '2' ? 'strict' : 'full');
    });
  });

  console.log(
    `\n===== RUNNING TEST CASES IN MODE: ${mode.toUpperCase()} =====\n`,
  );

  // Chạy test runner với API thật
  //await runApiIntegrationTest(setUserFollow, mode);
}

// Chạy main
main().catch((err) => {
  console.error('\nTEST RUNNER STOPPED DUE TO FAILURE:', err.message);
  process.exit(1);
});
