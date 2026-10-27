import {
	configErrorResponse,
	type Env,
	jsonResponse,
	opaqueError,
	requireDb,
} from "../../_shared/env";
import {
	createClearSessionCookieHeader,
	getAuthenticatedLearnerId,
} from "../../_shared/learnerAuth";

export async function onRequestPost(context: { request: Request; env: Env }) {
	const { request, env } = context;

	try {
		const learnerId = await getAuthenticatedLearnerId(request, env);
		if (!learnerId) {
			return opaqueError(401, "Unauthorized");
		}

		const db = requireDb(env);

		// Hard delete learner record from D1
		await db
			.prepare("DELETE FROM learner_progress WHERE learner_id = ?")
			.bind(learnerId)
			.run();

		const clearCookieHeader = createClearSessionCookieHeader();

		return jsonResponse(
			{ ok: true, deleted: true, message: "All telemetry erased" },
			200,
			{
				"Set-Cookie": clearCookieHeader,
			},
		);
	} catch (error: unknown) {
		console.error("learner telemetry purge failed", error);
		const misconfigured = configErrorResponse(error);
		if (misconfigured) return misconfigured;
		return opaqueError(500, "Failed to erase telemetry");
	}
}
