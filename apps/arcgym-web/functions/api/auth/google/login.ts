import {
	configErrorResponse,
	type Env,
	opaqueError,
	requireSecret,
} from "../../../_shared/env";

export async function onRequestGet(context: { request: Request; env: Env }) {
	const { request, env } = context;

	try {
		let clientId: string;
		try {
			clientId = requireSecret(env, "GOOGLE_CLIENT_ID");
		} catch {
			return opaqueError(503, "Google authentication not configured");
		}

		const url = new URL(request.url);
		const origin = url.origin;
		const redirectUri = `${origin}/api/auth/google/callback`;

		// State parameter carries a random nonce and a safe local returnUrl
		const rawReturn = url.searchParams.get("returnUrl") || "/";
		const safeReturn =
			rawReturn.startsWith("/") && !rawReturn.startsWith("//")
				? rawReturn
				: "/";

		const statePayload = JSON.stringify({
			nonce: crypto.randomUUID(),
			returnUrl: safeReturn,
		});
		const state = btoa(statePayload);

		const googleAuthUrl = new URL(
			"https://accounts.google.com/o/oauth2/v2/auth",
		);
		googleAuthUrl.searchParams.set("client_id", clientId);
		googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
		googleAuthUrl.searchParams.set("response_type", "code");
		// Minimal openid scope: we only need the user identifier (sub) to derive a pseudonymous ID.
		googleAuthUrl.searchParams.set("scope", "openid");
		googleAuthUrl.searchParams.set("state", state);
		googleAuthUrl.searchParams.set("prompt", "select_account");

		return Response.redirect(googleAuthUrl.toString(), 302);
	} catch (error: unknown) {
		const misconfigured = configErrorResponse(error);
		if (misconfigured) return misconfigured;
		console.error("google login redirect failed", error);
		return opaqueError(500, "Authentication initiation failed");
	}
}
