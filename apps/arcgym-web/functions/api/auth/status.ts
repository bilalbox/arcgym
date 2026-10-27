import type { Env } from "../../_shared/env";
import {
	createClearClientAuthCookieHeader,
	createClientAuthCookieHeader,
	getAuthenticatedLearnerId,
} from "../../_shared/learnerAuth";

export async function onRequestGet(context: { request: Request; env: Env }) {
	const { request, env } = context;
	const learnerId = await getAuthenticatedLearnerId(request, env);

	const headers = new Headers({ "Content-Type": "application/json" });

	if (!learnerId) {
		headers.append("Set-Cookie", createClearClientAuthCookieHeader());
		return new Response(JSON.stringify({ authenticated: false }), {
			status: 200,
			headers,
		});
	}

	headers.append("Set-Cookie", createClientAuthCookieHeader());
	return new Response(JSON.stringify({ authenticated: true, learnerId }), {
		status: 200,
		headers,
	});
}
