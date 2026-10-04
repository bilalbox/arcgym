import { configErrorResponse, type Env, requireSecret } from '../../../_shared/env';
import {
  createClientAuthCookieHeader,
  createSessionCookieHeader,
  deriveLearnerId,
  signSessionJwt,
} from '../../../_shared/learnerAuth';

interface GoogleTokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleIdTokenPayload {
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: number;
}

function parseJwtPayload(token: string): GoogleIdTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr) as GoogleIdTokenPayload;
  } catch {
    return null;
  }
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  let safeReturn = '/';

  try {
    const clientId = requireSecret(env, 'GOOGLE_CLIENT_ID');
    const clientSecret = requireSecret(env, 'GOOGLE_CLIENT_SECRET');
    const sessionSecret = requireSecret(env, 'SESSION_SECRET');
    const pepper = requireSecret(env, 'LEARNER_PEPPER');

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');

    if (stateParam) {
      try {
        const decoded = JSON.parse(atob(stateParam)) as { returnUrl?: string };
        if (decoded?.returnUrl?.startsWith('/') && !decoded.returnUrl.startsWith('//')) {
          safeReturn = decoded.returnUrl;
        }
      } catch {
        // Fallback to '/'
      }
    }

    if (!code) {
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=missing_code`, request.url).toString(),
        302,
      );
    }

    const redirectUri = `${url.origin}/api/auth/google/callback`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google token exchange failed', await tokenRes.text());
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=token_exchange`, request.url).toString(),
        302,
      );
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenData.id_token) {
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=missing_id_token`, request.url).toString(),
        302,
      );
    }

    const payload = parseJwtPayload(tokenData.id_token);
    if (!payload?.sub) {
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=invalid_token_payload`, request.url).toString(),
        302,
      );
    }

    // Verify token audience matches our Client ID
    if (payload.aud !== clientId) {
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=audience_mismatch`, request.url).toString(),
        302,
      );
    }

    // Derive pseudonymous learner ID: Zero PII stored
    const learnerId = await deriveLearnerId(payload.sub, pepper);

    // Issue session JWT
    const sessionJwt = await signSessionJwt(learnerId, sessionSecret);
    const cookieHeader = createSessionCookieHeader(sessionJwt);
    const clientCookieHeader = createClientAuthCookieHeader();

    // Append auth=success param for client sync hook to recognize
    const targetUrl = new URL(safeReturn, request.url);
    targetUrl.searchParams.set('auth', 'success');

    const headers = new Headers();
    headers.set('Location', targetUrl.toString());
    headers.append('Set-Cookie', cookieHeader);
    headers.append('Set-Cookie', clientCookieHeader);

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error: unknown) {
    const misconfigured = configErrorResponse(error);
    if (misconfigured) return misconfigured;
    console.error('Google auth callback failed', error);
    return Response.redirect(
      new URL(`${safeReturn}?auth=error&reason=server_error`, request.url).toString(),
      302,
    );
  }
}
