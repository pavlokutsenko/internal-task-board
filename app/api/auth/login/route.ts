import { NextRequest, NextResponse } from "next/server";
import { setRefreshCookie } from "@/lib/auth/cookies";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isPasswordValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isPasswordValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const claims = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(claims),
    signRefreshToken(claims),
  ]);

  const refreshTokenHash = await hashPassword(refreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  const response = NextResponse.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });

  setRefreshCookie(response, refreshToken);

  return response;
}
