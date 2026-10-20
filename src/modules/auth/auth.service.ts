import type { PublicUser } from './user.types.js';
import type { UserRepo } from './user.repository.js';
import type { PasswordHasher } from './password-hasher.js';

export interface AuthService {
  authenticate(email: string, password: string): Promise<PublicUser | null>;
  findUserById(id: number): Promise<PublicUser | null>;
}

export interface AuthServiceDeps {
  userRepo: UserRepo;
  passwordHasher: PasswordHasher;
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  const { userRepo, passwordHasher } = deps;

  return {
    async authenticate(
      email: string,
      password: string,
    ): Promise<PublicUser | null> {
      const user = await userRepo.findByEmail(email);
      if (!user) {
        return null;
      }

      const passwordMatches = await passwordHasher.verify(
        user.passwordHash,
        password,
      );

      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    },
    async findUserById(id: number): Promise<PublicUser | null> {
      const user = await userRepo.findById(id);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    },
  };
}
