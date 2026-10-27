import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../../_shared/env";
import {
	extractSessionCookie,
	verifySessionJwt,
} from "../../../_shared/learnerAuth";
import { onRequestGet as onCallbackGet } from "./callback";
import { onRequestGet as onLoginGet } from "./login";

describe("GitHub OAuth edge functions", () => {
	const TEST_ENV: Env = {
		GITHUB_CLIENT_ID: "github_client_id_at_least_16_chars",
		GITHUB_CLIENT_SECRET: "github_client_secret_at_least_16_chars",
		SESSION_SECRET: "test_session_secret_32_characters_minimum_length",
		LEARNER_PEPPER: "test_pepper_at_least_32_characters_long_for_security",
	};

	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe("GET /api/auth/github/login", () => {
		it("returns 503 if GITHUB_CLIENT_ID is missing or too short", async () => {
			const env: Env = {};
			const req = new Request("https://arcgym.23p.tech/api/auth/github/login");
			const res = await onLoginGet({ request: req, env });
			expect(res.status).toBe(503);
			const json = await res.json();
			expect(json.error).toContain("not configured");
		});

		it("redirects to github authorize URL with sanitized returnUrl in state", async () => {
			const req = new Request(
				"https://arcgym.23p.tech/api/auth/github/login?returnUrl=/drills/RF-001",
			);
			const res = await onLoginGet({ request: req, env: TEST_ENV });
			expect(res.status).toBe(302);

			const location = res.headers.get("Location") ?? "";
			expect(location).toBeTruthy();
			const targetUrl = new URL(location);
			expect(targetUrl.origin).toBe("https://github.com");
			expect(targetUrl.pathname).toBe("/login/oauth/authorize");
			expect(targetUrl.searchParams.get("client_id")).toBe(
				TEST_ENV.GITHUB_CLIENT_ID,
			);
			expect(targetUrl.searchParams.get("scope")).toBe("read:user");
			expect(targetUrl.searchParams.get("redirect_uri")).toBe(
				"https://arcgym.23p.tech/api/auth/github/callback",
			);

			const stateRaw = targetUrl.searchParams.get("state") ?? "";
			expect(stateRaw).toBeTruthy();
			const statePayload = JSON.parse(atob(stateRaw));
			expect(statePayload.returnUrl).toBe("/drills/RF-001");
			expect(statePayload.nonce).toBeTruthy();
		});

		it("neutralizes open redirect attempts in returnUrl", async () => {
			const req = new Request(
				"https://arcgym.23p.tech/api/auth/github/login?returnUrl=//evil.com/phish",
			);
			const res = await onLoginGet({ request: req, env: TEST_ENV });
			const location = res.headers.get("Location") ?? "";
			const targetUrl = new URL(location);
			const stateRaw = targetUrl.searchParams.get("state") ?? "";
			const statePayload = JSON.parse(atob(stateRaw));
			expect(statePayload.returnUrl).toBe("/");
		});
	});

	describe("GET /api/auth/github/callback", () => {
		it("redirects to error if code is missing", async () => {
			const req = new Request(
				"https://arcgym.23p.tech/api/auth/github/callback",
			);
			const res = await onCallbackGet({ request: req, env: TEST_ENV });
			expect(res.status).toBe(302);
			const location = res.headers.get("Location");
			expect(location).toContain("/?auth=error&reason=missing_code");
		});

		it("redirects to error if token exchange fails", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ error: "bad_verification_code" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				}),
			);

			const req = new Request(
				"https://arcgym.23p.tech/api/auth/github/callback?code=badcode",
			);
			const res = await onCallbackGet({ request: req, env: TEST_ENV });
			expect(res.status).toBe(302);
			expect(res.headers.get("Location")).toContain(
				"/?auth=error&reason=token_exchange",
			);
		});

		it("redirects to error if GitHub user API fails", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							access_token: "gho_dummy_token_123",
							token_type: "bearer",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					),
				)
				.mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

			const req = new Request(
				"https://arcgym.23p.tech/api/auth/github/callback?code=validcode",
			);
			const res = await onCallbackGet({ request: req, env: TEST_ENV });
			expect(res.status).toBe(302);
			expect(res.headers.get("Location")).toContain(
				"/?auth=error&reason=user_profile_fetch",
			);
		});

		it("redirects to error if user data has no id", async () => {
			globalThis.fetch = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							access_token: "gho_dummy_token_123",
							token_type: "bearer",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					),
				)
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ login: "octocat" }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					}),
				);

			const req = new Request(
				"https://arcgym.23p.tech/api/auth/github/callback?code=validcode",
			);
			const res = await onCallbackGet({ request: req, env: TEST_ENV });
			expect(res.status).toBe(302);
			expect(res.headers.get("Location")).toContain(
				"/?auth=error&reason=missing_user_id",
			);
		});

		it("successfully authorizes user, sets session cookies, and redirects to safe returnUrl", async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							access_token: "gho_valid_token_xyz",
							token_type: "bearer",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					),
				)
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							id: 987654321,
							login: "octocat",
							email: "secret@example.com",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					),
				);
			globalThis.fetch = fetchMock;

			const statePayload = JSON.stringify({
				nonce: "test-nonce",
				returnUrl: "/drills/RF-002",
			});
			const stateParam = btoa(statePayload);

			const req = new Request(
				`https://arcgym.23p.tech/api/auth/github/callback?code=valid_code_123&state=${stateParam}`,
			);
			const res = await onCallbackGet({ request: req, env: TEST_ENV });

			expect(res.status).toBe(302);
			expect(res.headers.get("Location")).toBe(
				"https://arcgym.23p.tech/drills/RF-002?auth=success",
			);

			// Verify cookies emitted
			const cookieHeader = res.headers.get("Set-Cookie") ?? "";
			expect(cookieHeader).toBeTruthy();
			expect(cookieHeader).toContain("arcgym_session=");
			expect(cookieHeader).toContain("arcgym_logged_in=1");
			expect(cookieHeader).toContain("HttpOnly");
			expect(cookieHeader).toContain("Secure");

			// Verify the session JWT contains a valid learnerId
			const sessionToken = extractSessionCookie(
				new Request("https://arcgym.23p.tech", {
					headers: { Cookie: cookieHeader },
				}),
			);
			expect(sessionToken).toBeTruthy();

			const session = await verifySessionJwt(
				sessionToken ?? "",
				TEST_ENV.SESSION_SECRET ?? "",
			);
			expect(session).not.toBeNull();
			expect(session?.learnerId).toHaveLength(64);

			// Verify fetch calls included required User-Agent
			const userCall = fetchMock.mock.calls[1];
			expect(userCall).toBeDefined();
			expect(userCall?.[0]).toBe("https://api.github.com/user");
			const userHeaders = userCall?.[1]?.headers;
			expect(userHeaders).toBeDefined();
			expect(userHeaders?.["User-Agent"]).toBe("ArcGym-Auth");
			expect(userHeaders?.Authorization).toBe("Bearer gho_valid_token_xyz");
		});
	});
});
