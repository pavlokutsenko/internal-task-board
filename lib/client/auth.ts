"use client";

const ACCESS_TOKEN_KEY = "task_board_access_token";

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
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
