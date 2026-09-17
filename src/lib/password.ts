import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function isPasswordStrong(plain: string) {
  // FR-1/§10: min 8 chars, at least one letter and one number.
  return plain.length >= 8 && /[a-zA-Z]/.test(plain) && /[0-9]/.test(plain);
}
