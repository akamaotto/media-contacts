import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json();

    // Basic input validation and normalization
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail.length === 0) {
      return NextResponse.json({ error: "Email is invalid" }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check if user already exists (best-effort; still handle unique error on create)
    const existing = await prisma.users.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.users.create({
      data: {
        id: randomUUID(),
        email: normalizedEmail,
        name,
        hashedPassword,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    // Handle unique constraint violation from Prisma (race-safe)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    console.error("Register error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
