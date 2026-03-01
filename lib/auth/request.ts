export function getAuthenticatedUserId(request: Request) {
  return request.headers.get("x-user-id");
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice(7).trim();

  return token.length > 0 ? token : null;
}
