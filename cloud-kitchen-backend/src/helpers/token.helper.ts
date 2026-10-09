import jwt from "jsonwebtoken";

export function generateAccessToken(userId: string): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not defined");
  return jwt.sign(
    { userId },
    secret,
    { expiresIn: "15m" }
  );
}

export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.sign(
    { userId },
    secret,
    { expiresIn: "7d" }
  );
}