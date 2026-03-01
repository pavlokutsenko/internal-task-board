import { JWTPayload, SignJWT, jwtVerify } from "jose";

const ISSUER = "internal-task-board";
const AUDIENCE = "task-board-api";
const ACCESS_EXPIRATION = "15m";
const REFRESH_EXPIRATION = "7d";

type TokenType = "access" | "refresh";

export type AuthTokenPayload = JWTPayload & {
  sub: string;
  email: string;
  name: string;
  tokenType: TokenType;
};

type UserClaims = {
  id: string;
  email: string;
  name: string;
};

function getSecret(key: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is not set`);
  }

  return new TextEncoder().encode(value);
}

async function signToken(user: UserClaims, tokenType: TokenType) {
  const secret =
    tokenType === "access"
      ? getSecret("JWT_ACCESS_SECRET")
      : getSecret("JWT_REFRESH_SECRET");

  const expiration = tokenType === "access" ? ACCESS_EXPIRATION : REFRESH_EXPIRATION;

  return new SignJWT({
    email: user.email,
    name: user.name,
    tokenType,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(secret);
}

async function verifyToken(token: string, tokenType: TokenType) {
  try {
    const secret =
      tokenType === "access"
        ? getSecret("JWT_ACCESS_SECRET")
        : getSecret("JWT_REFRESH_SECRET");

    const { payload } = await jwtVerify<AuthTokenPayload>(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (payload.tokenType !== tokenType || typeof payload.sub !== "string") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function signAccessToken(user: UserClaims) {
  return signToken(user, "access");
}

export function signRefreshToken(user: UserClaims) {
  return signToken(user, "refresh");
}

export function verifyAccessToken(token: string) {
  return verifyToken(token, "access");
}

export function verifyRefreshToken(token: string) {
  return verifyToken(token, "refresh");
}
