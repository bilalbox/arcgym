import { configErrorResponse, type Env, requireSecret } from '../../../_shared/env';
import {
  createClientAuthCookieHeader,
  createSessionCookieHeader,
  deriveLearnerId,
  signSessionJwt,
} from '../../../_shared/learnerAuth';

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id?: number | string;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  let safeReturn = '/';

  try {
    const clientId = requireSecret(env, 'GITHUB_CLIENT_ID');
    const clientSecret = requireSecret(env, 'GITHUB_CLIENT_SECRET');
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

    const redirectUri = `${url.origin}/api/auth/github/callback`;

    // Exchange authorization code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'ArcGym-Auth',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error('GitHub token exchange failed', await tokenRes.text());
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=token_exchange`, request.url).toString(),
        302,
      );
    }

    const tokenData = (await tokenRes.json()) as GitHubTokenResponse;
    if (tokenData.error || !tokenData.access_token) {
      console.error(
        'GitHub token exchange returned error',
        tokenData.error,
        tokenData.error_description,
      );
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=token_exchange`, request.url).toString(),
        302,
      );
    }

    // Retrieve user identifier from GitHub User API (User-Agent header required by GitHub)
    const userRes = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ArcGym-Auth',
      },
    });

    if (!userRes.ok) {
      console.error('GitHub user profile fetch failed', await userRes.text());
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=user_profile_fetch`, request.url).toString(),
        302,
      );
    }

    const userData = (await userRes.json()) as GitHubUserResponse;
    if (!userData.id) {
      return Response.redirect(
        new URL(`${safeReturn}?auth=error&reason=missing_user_id`, request.url).toString(),
        302,
      );
    }

    // Derive pseudonymous learner ID: Zero PII stored (namespaced to github)
    const learnerId = await deriveLearnerId(`github:${userData.id}`, pepper);

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
    console.error('GitHub auth callback failed', error);
    return Response.redirect(
      new URL(`${safeReturn}?auth=error&reason=server_error`, request.url).toString(),
      302,
    );
  }
}
