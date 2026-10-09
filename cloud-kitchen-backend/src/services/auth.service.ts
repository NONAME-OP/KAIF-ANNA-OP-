import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import {
  hashPassword,
  comparePassword,
} from "../helpers/password.helper";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../helpers/token.helper";

interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export async function signUp(data: SignUpData) {
  const { name, email, password } = data;

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function login(email: string, password: string) {
  // Find the user
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check the password
  const passwordMatches = await comparePassword(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token in database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  // Verify the refresh token
  let payload: { userId: string };

  try {
    payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as { userId: string };
  } catch {
    throw new Error("Invalid refresh token");
  }

  // Check that the token exists in our database
  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      token: refreshToken,
    },
  });

  if (!storedToken) {
    throw new Error("Refresh token not found");
  }

  // Check expiration
  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({
      where: {
        id: storedToken.id,
      },
    });

    throw new Error("Refresh token expired");
  }

  // Make sure the token belongs to the same user
  if (storedToken.userId !== payload.userId) {
    throw new Error("Invalid refresh token");
  }

  // Generate a new access token
  const accessToken = generateAccessToken(payload.userId);

  return accessToken;
}

export async function logout(refreshToken: string) {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshToken.deleteMany({
    where: {
      token: refreshToken,
    },
  });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  // Don't reveal whether an email exists
  if (!user) {
    return;
  }

  // Generate a random reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Store the token and make it valid for 15 minutes
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      resetPasswordToken: resetToken,
      resetPasswordExpiresAt: new Date(
        Date.now() + 15 * 60 * 1000
      ),
    },
  });

  // Development only
  console.log("Password reset token:", resetToken);

  return resetToken;
}

export async function resetPassword(
  resetToken: string,
  newPassword: string
) {
  if (!resetToken || !newPassword) {
    throw new Error("Reset token and new password are required");
  }

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: resetToken,
      resetPasswordExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    },
  });

  // Invalidate all existing refresh-token sessions
  await prisma.refreshToken.deleteMany({
    where: {
      userId: user.id,
    },
  });
}