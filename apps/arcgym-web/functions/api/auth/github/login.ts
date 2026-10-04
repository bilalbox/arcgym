import { configErrorResponse, type Env, opaqueError, requireSecret } from '../../../_shared/env';

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  try {
    let clientId: string;
    try {
      clientId = requireSecret(env, 'GITHUB_CLIENT_ID');
    } catch {
      return opaqueError(503, 'GitHub authentication not configured');
    }

    const url = new URL(request.url);
    const origin = url.origin;
    const redirectUri = `${origin}/api/auth/github/callback`;

    // State parameter carries a random nonce and a safe local returnUrl
    const rawReturn = url.searchParams.get('returnUrl') || '/';
    const safeReturn = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/';

    const statePayload = JSON.stringify({
      nonce: crypto.randomUUID(),
      returnUrl: safeReturn,
    });
    const state = btoa(statePayload);

    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', clientId);
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
    githubAuthUrl.searchParams.set('state', state);
    githubAuthUrl.searchParams.set('scope', 'read:user');

    return Response.redirect(githubAuthUrl.toString(), 302);
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('github login redirect failed', error);
    return opaqueError(500, 'Authentication initiation failed');
  }
}
