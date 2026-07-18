import { Role } from '../enums/role.enum';

/** Decoded JWT payload signed at login. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  roles: Role[];
  type: 'access' | 'refresh';
}

/** What guards attach to request.user after validating the access token. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: Role[];
}
