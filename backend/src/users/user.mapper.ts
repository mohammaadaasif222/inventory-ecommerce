import { Role } from '../common/enums/role.enum';
import { AuthProvider, UserStatus } from './enums/user-status.enum';
import { User } from './entities/user.entity';

/** Safe, serialisable view of a user (no secrets). */
export interface PublicUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  roles: Role[];
  status: UserStatus;
  provider: AuthProvider;
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Strip all sensitive columns before a user leaves the API boundary. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    roles: user.roles,
    status: user.status,
    provider: user.provider,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
