import { apiGet, apiPost } from "@/lib/api/client";

const TOKEN_KEY = "eshop_admin_token";
const USER_KEY = "eshop_admin_user";

export type DjangoUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  groups?: string[];
  permissions?: string[];
};

export type AuthResponse = { token: string; user: DjangoUser };
export type SignUpPayload = Pick<DjangoUser, "username" | "email" | "first_name" | "last_name"> & {
  password: string;
  confirm_password: string;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): DjangoUser | null {
  if (typeof window === "undefined") return null;
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser) as DjangoUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function saveAuth(authResponse: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, authResponse.token);
  localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function signIn(emailOrUsername: string, password: string) {
  const response = await apiPost<AuthResponse>("/auth/signin/", {
    email_or_username: emailOrUsername,
    password,
  });
  saveAuth(response);
  return response;
}

export async function signUp(payload: SignUpPayload) {
  const response = await apiPost<AuthResponse>("/auth/signup/", payload);
  saveAuth(response);
  return response;
}

export async function signOut() {
  try {
    await apiPost("/auth/signout/");
  } finally {
    clearAuthStorage();
  }
}

export async function getCurrentUser() {
  try {
    const user = await apiGet<DjangoUser>("/auth/me/");
    if (typeof window !== "undefined") localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    clearAuthStorage();
    throw error;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}
