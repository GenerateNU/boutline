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

export type SignupFields = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };
