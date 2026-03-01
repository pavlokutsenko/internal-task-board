import { NextRequest, NextResponse } from "next/server";
import { clearRefreshCookie, getRefreshToken, setRefreshCookie } from "@/lib/auth/cookies";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const refreshToken = getRefreshToken(request);

  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);

  if (!payload?.sub) {
    const response = NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    clearRefreshCookie(response);
    return response;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user?.refreshTokenHash) {
    const response = NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    clearRefreshCookie(response);
    return response;
  }

  const matches = await verifyPassword(refreshToken, user.refreshTokenHash);

  if (!matches) {
    const response = NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    clearRefreshCookie(response);
    return response;
  }

  const claims = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  const [accessToken, newRefreshToken] = await Promise.all([
    signAccessToken(claims),
    signRefreshToken(claims),
  ]);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshTokenHash: await hashPassword(newRefreshToken),
    },
  });

  const response = NextResponse.json({ accessToken });
  setRefreshCookie(response, newRefreshToken);

  return response;
}
