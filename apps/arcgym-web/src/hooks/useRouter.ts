import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight client-side router hook for ArcGym.
 * Handles client-side navigation between '/', '/skills', '/privacy', '/terms', '/cases', '/cases/:id',
 * '/troubleshoot', '/troubleshoot/:id', '/drills/:id', and (DEV only) '/dev/drills'
 * with HTML5 History API support.
 */
function getPath() {
	if (typeof window === "undefined") return "/";
	return window.location.pathname.replace(/\/+$/, "") || "/";
}

function getSearch() {
	if (typeof window === "undefined") return "";
	return window.location.search;
}

export function useRouter() {
	const [pathname, setPathname] = useState<string>(getPath);
	const [search, setSearch] = useState<string>(getSearch);

	useEffect(() => {
		const handlePopState = () => {
			setPathname(getPath());
			setSearch(getSearch());
		};

		window.addEventListener("popstate", handlePopState);
		return () => {
			window.removeEventListener("popstate", handlePopState);
		};
	}, []);

	const navigate = useCallback((to: string) => {
		if (typeof window === "undefined") return;

		try {
			const parsed = new URL(to, window.location.origin);
			const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
			const full = normalizedPath + parsed.search;

			if (window.location.pathname + window.location.search !== full) {
				window.history.pushState({}, "", full);
				setPathname(normalizedPath);
				setSearch(parsed.search);
			}
		} catch {
			window.history.pushState({}, "", to);
			setPathname(to);
		}
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	return { pathname, search, navigate };
}
