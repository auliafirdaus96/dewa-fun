

import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error(
    '[FATAL] JWT_SECRET environment variable is required. Set it in .env.local or your deployment provider.'
  );
}

export function verifyToken(token: string): Promise<{ userId: string; wallet: string }> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, SECRET as string, (err: any, decoded: any) => {
      if (err) reject(err)
      else resolve(decoded as any)
    })
  })
}
