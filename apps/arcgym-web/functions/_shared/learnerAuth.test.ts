import { describe, expect, it } from "vitest";
import {
	createClearSessionCookieHeader,
	createSessionCookieHeader,
	deriveLearnerId,
	extractSessionCookie,
	getAuthenticatedLearnerId,
	SESSION_COOKIE_NAME,
	signSessionJwt,
	verifySessionJwt,
} from "./learnerAuth";

describe("learnerAuth", () => {
	const TEST_PEPPER = "test_pepper_at_least_32_characters_long_for_security";
	const TEST_SECRET = "test_session_secret_32_characters_minimum_length";

	it("derives a consistent pseudonymous learner ID", async () => {
		const sub = "google-sub-12345";
		const id1 = await deriveLearnerId(sub, TEST_PEPPER);
		const id2 = await deriveLearnerId(sub, TEST_PEPPER);
		expect(id1).toBe(id2);
		expect(id1).toHaveLength(64); // 32-byte sha256 hex string

		const idOther = await deriveLearnerId("google-sub-99999", TEST_PEPPER);
		expect(id1).not.toBe(idOther);
	});

	it("isolates GitHub provider subjects from Google subjects with the same numeric ID", async () => {
		const rawId = "12345678";
		const googleId = await deriveLearnerId(rawId, TEST_PEPPER);
		const githubId = await deriveLearnerId(`github:${rawId}`, TEST_PEPPER);

		expect(googleId).toHaveLength(64);
		expect(githubId).toHaveLength(64);
		expect(googleId).not.toBe(githubId);
	});

	it("signs and verifies a session JWT", async () => {
		const learnerId = "mock_learner_id_123";
		const token = await signSessionJwt(learnerId, TEST_SECRET, 3600);
		expect(token.split(".")).toHaveLength(3);

		const verified = await verifySessionJwt(token, TEST_SECRET);
		expect(verified).not.toBeNull();
		expect(verified?.learnerId).toBe(learnerId);
		expect(verified?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it("rejects tampered or expired JWTs", async () => {
		const token = await signSessionJwt("learner_abc", TEST_SECRET, -10); // already expired
		const expiredResult = await verifySessionJwt(token, TEST_SECRET);
		expect(expiredResult).toBeNull();

		const validToken = await signSessionJwt("learner_abc", TEST_SECRET, 3600);
		const tamperedToken = `${validToken.slice(0, -4)}xxxx`;
		const tamperedResult = await verifySessionJwt(tamperedToken, TEST_SECRET);
		expect(tamperedResult).toBeNull();

		const wrongSecretResult = await verifySessionJwt(
			validToken,
			"different_secret_key_at_least_32_chars_long",
		);
		expect(wrongSecretResult).toBeNull();
	});

	it("parses and creates session cookies correctly", async () => {
		const token = "sample.jwt.token";
		const setCookie = createSessionCookieHeader(token);
		expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=${token}`);
		expect(setCookie).toContain("HttpOnly");
		expect(setCookie).toContain("Secure");
		expect(setCookie).toContain("SameSite=Lax");

		const clearCookie = createClearSessionCookieHeader();
		expect(clearCookie).toContain("Max-Age=0");

		const reqWithCookie = new Request(
			"https://arcgym.23p.tech/api/learner/sync",
			{
				headers: {
					Cookie: `theme=dark; ${SESSION_COOKIE_NAME}=${token}; other=val`,
				},
			},
		);
		expect(extractSessionCookie(reqWithCookie)).toBe(token);

		const reqNoCookie = new Request("https://arcgym.23p.tech/api/learner/sync");
		expect(extractSessionCookie(reqNoCookie)).toBeNull();
	});

	it("authenticates learner from request via getAuthenticatedLearnerId", async () => {
		const learnerId = "verified_learner_999";
		const token = await signSessionJwt(learnerId, TEST_SECRET, 3600);
		const env = { SESSION_SECRET: TEST_SECRET };

		const req = new Request("https://arcgym.23p.tech/api/learner/sync", {
			headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
		});
		const result = await getAuthenticatedLearnerId(req, env);
		expect(result).toBe(learnerId);

		const invalidReq = new Request("https://arcgym.23p.tech/api/learner/sync", {
			headers: { Cookie: `${SESSION_COOKIE_NAME}=invalid.token.here` },
		});
		const invalidResult = await getAuthenticatedLearnerId(invalidReq, env);
		expect(invalidResult).toBeNull();
	});
});
