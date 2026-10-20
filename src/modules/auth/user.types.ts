export type Role = 'USER' | 'WORKER';

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export type PublicUser = Omit<User, 'passwordHash'>;
