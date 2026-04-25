// test/helpers/auth.helper.ts

import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function generateAuthToken(
  userId: number,
  username: string = 'testuser',
  role: string = 'user',
): string {
  return jwt.sign(
    {
      sub: userId,
      username,
      role,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    },
  );
}
