const Sequencer = require('@jest/test-sequencer').default;

const ORDER = [
  '1-signup.e2e-spec.ts',
  '2-login.e2e-spec.ts',
  '3-logout.e2e-spec.ts',
  '4-create-code-reset-password.e2e-spec.ts',
  '5-check-code-reset-password.e2e-spec.ts',
  '6-reset-password.e2e-spec.ts',
  '7-change-password.e2e-spec.ts',
  '8-change-info-after-signup.e2e-spec.ts',
  '9-set-devtoken.e2e-spec.ts',
  '10-get-push-settings.e2e-spec.ts',
  '11-set-push-settings.e2e-spec.ts',
];

class CustomSequencer extends Sequencer {
  sort(tests) {
    const copyTests = Array.from(tests);
    return copyTests.sort((testA, testB) => {
      // Tìm vị trí của file testA và testB dựa theo mảng ORDER
      const indexA = ORDER.findIndex(name => testA.path.includes(name));
      const indexB = ORDER.findIndex(name => testB.path.includes(name));

      // Những file có tên trong mảng ORDER sẽ được xếp ưu tiên chạy trước
      if (indexA === indexB) return 0;
      if (indexA === -1) return 1; // File không khai báo chạy cuối
      if (indexB === -1) return -1;
      
      return indexA < indexB ? -1 : 1;
    });
  }
}

module.exports = CustomSequencer;
