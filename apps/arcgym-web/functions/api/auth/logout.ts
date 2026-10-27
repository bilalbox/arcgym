import { jsonResponse } from "../../_shared/env";
import {
	createClearClientAuthCookieHeader,
	createClearSessionCookieHeader,
} from "../../_shared/learnerAuth";

export async function onRequest(context: { request: Request }) {
	const { request } = context;
	const url = new URL(request.url);
	const returnUrl = url.searchParams.get("returnUrl");

	const clearCookieHeader = createClearSessionCookieHeader();
	const clearClientCookieHeader = createClearClientAuthCookieHeader();

	const headers = new Headers();
	headers.append("Set-Cookie", clearCookieHeader);
	headers.append("Set-Cookie", clearClientCookieHeader);

	if (returnUrl?.startsWith("/") && !returnUrl.startsWith("//")) {
		headers.set("Location", returnUrl);
		return new Response(null, {
			status: 302,
			headers,
		});
	}

	return jsonResponse({ ok: true, authenticated: false }, 200, {
		"Set-Cookie": clearCookieHeader,
	});
}
