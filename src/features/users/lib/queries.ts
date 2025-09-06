
import { prisma } from "@/lib/database/prisma";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UserError, UserErrorType, type UserFilters } from "./types";

/**
 * Fetches a list of users based on specified filters.
 * Excludes sensitive data like passwords.
 * Admin-only query.
 */
export async function getFilteredUsers(filters: UserFilters = {}) {
  try {
    const where: Prisma.usersWhereInput = {};
    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    throw new UserError("Failed to fetch users from database", UserErrorType.DATABASE_ERROR, error);
}
}

/**
 * Fetches a single user by their ID.
 * Excludes sensitive data.
 */
export async function getUserById(id: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UserError(`User with ID ${id} not found`, UserErrorType.NOT_FOUND);
    }
    return user;
  } catch (error) {
    if (error instanceof UserError) throw error;
    throw new UserError("Failed to fetch user from database", UserErrorType.DATABASE_ERROR, error);
  }
}

/**
 * Fetches a user by their email. Can optionally include the hashed password
 * for authentication purposes.
 */
export async function getUserByEmail(email: string, includePassword = false) {
  try {
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hashedPassword: includePassword,
      },
    });

    if (!user) {
      throw new UserError(`User with email ${email} not found`, UserErrorType.NOT_FOUND);
    }
    return user;
  } catch (error) {
    if (error instanceof UserError) throw error;
    throw new UserError("Failed to fetch user from database", UserErrorType.DATABASE_ERROR, error);
  }
}

/**
 * Verifies a user's password against the stored hash.
 */
export async function verifyUserPassword(email: string, password: string) {
  try {
    const user = await getUserByEmail(email, true);
    if (!user.hashedPassword) {
      throw new UserError("User has no password set", UserErrorType.INVALID_PASSWORD);
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      throw new UserError("Invalid password", UserErrorType.INVALID_PASSWORD);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword };
  } catch (error) {
    if (error instanceof UserError) throw error;
    throw new UserError("Failed to verify password", UserErrorType.DATABASE_ERROR, error);
  }
}
