export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };
