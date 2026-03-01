"use client";

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

async function requestRefreshToken() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    clearAccessToken();
    return null;
  }

  const payload = (await response.json()) as { accessToken: string };

  setAccessToken(payload.accessToken);
  return payload.accessToken;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const call = async (token: string | null) => {
    const headers = new Headers(init.headers ?? undefined);

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    return fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });
  };

  let token = getAccessToken();
  let response = await call(token);

  if (response.status !== 401) {
    return response;
  }

  token = await requestRefreshToken();

  if (!token) {
    return response;
  }

  response = await call(token);

  if (response.status === 401) {
    clearAccessToken();
  }

  return response;
}
