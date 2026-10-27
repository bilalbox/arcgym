/**
 * Learner Authentication & Session Management helpers for Cloudflare Pages Functions.
 * Implements pseudonymous Zero-PII ID derivation and HttpOnly session cookies.
 */

import { type Env, requireSecret } from "./env";
import { hmacSha256Hex } from "./hmac";

export const SESSION_COOKIE_NAME = "arcgym_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface LearnerSessionPayload {
	learnerId: string;
	exp: number; // Unix timestamp in seconds
}

function base64UrlEncode(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];
		if (byte === undefined) continue;
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function base64UrlDecode(base64Url: string): string {
	let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
	while (base64.length % 4 !== 0) {
		base64 += "=";
	}
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

/**
 * Derives a deterministic, irreversible pseudonymous learner ID from an OAuth provider's subject ID.
 * Learner ID = HMAC-SHA256(pepper, "learner:<sub_id>")
 */
export async function deriveLearnerId(
	providerSub: string,
	pepper: string,
): Promise<string> {
	if (!providerSub || !pepper) {
		throw new Error("Missing providerSub or pepper for learner ID derivation");
	}
	return hmacSha256Hex(pepper, `learner:${providerSub}`);
}

/**
 * Signs a stateless session JWT using HMAC-SHA256.
 */
export async function signSessionJwt(
	learnerId: string,
	secret: string,
	ttlSeconds = SESSION_MAX_AGE_SECONDS,
): Promise<string> {
	const header = { alg: "HS256", typ: "JWT" };
	const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
	const payload: LearnerSessionPayload = { learnerId, exp };

	const encodedHeader = base64UrlEncode(JSON.stringify(header));
	const encodedPayload = base64UrlEncode(JSON.stringify(payload));
	const message = `${encodedHeader}.${encodedPayload}`;

	const signatureHex = await hmacSha256Hex(secret, message);
	const encodedSignature = base64UrlEncode(signatureHex);

	return `${message}.${encodedSignature}`;
}

/**
 * Verifies a stateless session JWT, checking signature and expiration.
 */
export async function verifySessionJwt(
	jwt: string,
	secret: string,
): Promise<LearnerSessionPayload | null> {
	const parts = jwt.split(".");
	if (parts.length !== 3) return null;

	const encodedHeader = parts[0];
	const encodedPayload = parts[1];
	const encodedSignature = parts[2];
	if (
		encodedHeader === undefined ||
		encodedPayload === undefined ||
		encodedSignature === undefined
	) {
		return null;
	}
	const message = `${encodedHeader}.${encodedPayload}`;

	try {
		const expectedSigHex = await hmacSha256Hex(secret, message);
		const expectedSigEncoded = base64UrlEncode(expectedSigHex);

		if (encodedSignature !== expectedSigEncoded) {
			return null;
		}

		const payload = JSON.parse(
			base64UrlDecode(encodedPayload),
		) as LearnerSessionPayload;
		if (!payload.learnerId || typeof payload.exp !== "number") {
			return null;
		}

		const now = Math.floor(Date.now() / 1000);
		if (now > payload.exp) {
			return null; // Expired
		}

		return payload;
	} catch {
		return null;
	}
}

/**
 * Extracts the arcgym_session cookie from a Request.
 */
export function extractSessionCookie(request: Request): string | null {
	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";");
	for (const cookie of cookies) {
		const [name, ...rest] = cookie.trim().split("=");
		if (name === SESSION_COOKIE_NAME) {
			return rest.join("=");
		}
	}
	return null;
}

export const CLIENT_AUTH_COOKIE_NAME = "arcgym_logged_in";

/**
 * Creates the Set-Cookie header string for establishing a session.
 */
export function createSessionCookieHeader(token: string): string {
	return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

/**
 * Creates a non-sensitive, client-readable cookie to prevent unauthenticated UI flash (FOUC).
 */
export function createClientAuthCookieHeader(): string {
	return `${CLIENT_AUTH_COOKIE_NAME}=1; Path=/; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

/**
 * Creates the Set-Cookie header string for clearing a session.
 */
export function createClearSessionCookieHeader(): string {
	return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/**
 * Creates the Set-Cookie header string for clearing the client companion cookie.
 */
export function createClearClientAuthCookieHeader(): string {
	return `${CLIENT_AUTH_COOKIE_NAME}=; Path=/; Secure; SameSite=Lax; Max-Age=0`;
}

/**
 * Resolves the authenticated learner ID from the request cookie, or null if unauthenticated.
 */
export async function getAuthenticatedLearnerId(
	request: Request,
	env: Env,
): Promise<string | null> {
	const token = extractSessionCookie(request);
	if (!token) return null;

	let sessionSecret: string;
	try {
		sessionSecret = requireSecret(env, "SESSION_SECRET");
	} catch {
		return null;
	}

	const payload = await verifySessionJwt(token, sessionSecret);
	return payload ? payload.learnerId : null;
}
