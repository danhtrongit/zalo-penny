import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string; role: string } {
  return jwt.verify(token, env.jwtSecret) as { userId: string; role: string };
}

/**
 * Short-lived, single-purpose token for chat magic-link login. Delivered
 * privately in the user's Zalo chat and exchanged at /auth/magic for a normal
 * session token. The `typ` claim prevents it being used as a session token.
 */
export function signMagicToken(userId: string): string {
  return jwt.sign({ userId, typ: "magic" }, env.jwtSecret, { expiresIn: "10m" });
}

export function verifyMagicToken(token: string): { userId: string } {
  const decoded = jwt.verify(token, env.jwtSecret) as { userId?: string; typ?: string };
  if (decoded.typ !== "magic" || !decoded.userId) {
    throw new Error("Invalid magic token");
  }
  return { userId: decoded.userId };
}
