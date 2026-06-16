declare namespace jest {
  interface Expect {
    <T = unknown>(actual: T, message?: string): JestMatchers<T>;
  }
}
