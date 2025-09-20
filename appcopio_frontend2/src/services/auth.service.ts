import { api, setAccessToken } from "@/lib/api";
import type { User } from "@/types/user";

export async function login(username: string, password: string) {
  const { data } = await api.post<{ access_token: string; user: User }>("/api/auth/login", {    username,
    password,
  });
  setAccessToken(data.access_token);
  return data.user;
}

export async function logout() {
  try {
    await api.post("api/auth/logout");
  } finally {
    setAccessToken(null);
  }
}
