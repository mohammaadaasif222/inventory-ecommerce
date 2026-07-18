import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../common/interfaces/authenticated-user.interface';

/** Extract a bearer token from the socket handshake (auth, query or header). */
function extractToken(client: Socket): string | null {
  const auth = client.handshake.auth as { token?: string } | undefined;
  if (auth?.token) return auth.token.replace(/^Bearer\s+/i, '');
  const q = client.handshake.query?.token;
  if (typeof q === 'string') return q;
  const header = client.handshake.headers?.authorization;
  if (header) return header.replace(/^Bearer\s+/i, '');
  return null;
}

/** Verify the socket's JWT and return the authenticated user, or null. */
export function authenticateSocket(
  client: Socket,
  jwt: JwtService,
  accessSecret: string,
): AuthenticatedUser | null {
  const token = extractToken(client);
  if (!token) return null;
  try {
    const payload = jwt.verify<JwtPayload>(token, { secret: accessSecret });
    if (payload.type !== 'access') return null;
    return { id: payload.sub, email: payload.email, roles: payload.roles };
  } catch {
    return null;
  }
}
