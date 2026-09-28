import { type Env, opaqueError, requireSecret, timingSafeEqualString } from './env';

/**
 * Header-only admin auth. Never accept secrets via query string.
 */
export function requireAdminAuth(request: Request, env: Env): Response | null {
  const secret = requireSecret(env, 'ARCGYM_ADMIN_KEY');
  const provided = request.headers.get('x-arcgym-admin-key');
  if (!provided || !timingSafeEqualString(provided, secret)) {
    return opaqueError(401, 'Unauthorized');
  }
  return null;
}
