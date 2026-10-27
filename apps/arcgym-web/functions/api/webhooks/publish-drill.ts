import { validatePublishDrillPayload } from "../../_shared/drillValidation";
import {
	configErrorResponse,
	type Env,
	jsonResponse,
	opaqueError,
	readJsonBody,
	requireKv,
	requireSecret,
} from "../../_shared/env";
import { verifyHmacSha256Hex } from "../../_shared/hmac";

const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

export async function onRequestPost(context: { request: Request; env: Env }) {
	const { request, env } = context;

	const signature = request.headers.get("x-arcgym-signature");
	if (!signature) {
		return opaqueError(401, "Missing X-ArcGym-Signature header");
	}

	try {
		const secret = requireSecret(env, "ARCGYM_HMAC_SECRET");
		const parsed = await readJsonBody(request, MAX_WEBHOOK_BODY_BYTES);
		if (!parsed.ok) return parsed.response;

		const isValid = await verifyHmacSha256Hex(secret, parsed.text, signature);
		if (!isValid) {
			return opaqueError(401, "Invalid HMAC signature");
		}

		const validated = validatePublishDrillPayload(parsed.json);
		if (!validated.ok) {
			return opaqueError(400, validated.error);
		}

		const drill = validated.drill;
		const kv = requireKv(env);
		const scheduledDate =
			(typeof drill.scheduledDate === "string" && drill.scheduledDate) ||
			new Date().toISOString().slice(0, 10);
		const drillId = drill.id as string;

		// Persist validated JSON only (not raw untrusted extras beyond parse).
		const payload = JSON.stringify(drill);
		await kv.put(`drill:${scheduledDate}`, payload);
		await kv.put("drill:today", payload);
		await kv.put(`drill:id:${drillId}`, payload);

		return jsonResponse({
			success: true,
			drillId,
			scheduledDate,
			cachedAt: new Date().toISOString(),
		});
	} catch (error: unknown) {
		const misconfigured = configErrorResponse(error);
		if (misconfigured) return misconfigured;
		console.error("publish-drill webhook failed", error);
		return opaqueError(500, "Failed to process webhook");
	}
}
