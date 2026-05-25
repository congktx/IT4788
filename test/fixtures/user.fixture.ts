export const USER_FIXTURES = [
  {
    phone_number: '0911222333',
    password: 'trinhyennhi',
    uuid: 'device-001',
  },
  {
    phone_number: '0900000002',
    password: 'Password123',
    uuid: 'device-002',
  },
  {
    phone_number: '0900000003',
    password: 'Password123',
    uuid: 'device-003',
  },
  {
    phone_number: '0900000004',
    password: 'Password123',
    uuid: 'device-004',
  },
  {
    phone_number: '0900000005',
    password: 'Password123',
    uuid: 'device-005',
  },
] as const;

export type UserFixture = (typeof USER_FIXTURES)[number];

// Token đã hết hạn
export const EXPIRED_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItb2xkIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9'; // token cũ copy từ trước
