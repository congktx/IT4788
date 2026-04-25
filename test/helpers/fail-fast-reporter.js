// test/helpers/fail-fast-reporter.js
class FailFastReporter {
  onTestCaseResult(_test, testCaseResult) {
    if (testCaseResult.status === 'failed') {
      console.log(`\n❌ FAIL: ${testCaseResult.fullName}`);
      testCaseResult.failureMessages.forEach((msg) => {
        const lines = msg
          .split('\n')
          .filter(
            (line) =>
              line.includes('Expected') ||
              line.includes('Received') ||
              line.includes('Full response'),
          );
        console.log(lines.join('\n'));
      });
      setTimeout(() => process.exit(1), 100);
    }
  }
}

module.exports = FailFastReporter;
