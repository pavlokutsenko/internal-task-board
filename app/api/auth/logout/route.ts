import { NextRequest, NextResponse } from "next/server";
import { clearRefreshCookie, getRefreshToken } from "@/lib/auth/cookies";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const refreshToken = getRefreshToken(request);

  if (refreshToken) {
    const payload = await verifyRefreshToken(refreshToken);

    if (payload?.sub) {
      await prisma.user.updateMany({
        where: { id: payload.sub },
        data: { refreshTokenHash: null },
      });
    }
  }

  const response = NextResponse.json({ success: true });
  clearRefreshCookie(response);

  return response;
}
