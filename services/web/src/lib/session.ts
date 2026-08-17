// Session storage for the bearer token hermes's auth middleware expects
// (Authorization: Bearer <token> — see services/hermes/internal/auth/auth.go).
// No cookie is used: the token lives in localStorage and every request
// attaches it explicitly through the Apollo auth link.

const TOKEN_KEY = "mn_session_token";
const EXPIRES_KEY = "mn_session_expires_at";

export type StoredSession = {
	token: string;
	expiresAt: string;
};

export function getSession(): StoredSession | null {
	if (typeof window === "undefined") return null;
	const token = window.localStorage.getItem(TOKEN_KEY);
	const expiresAt = window.localStorage.getItem(EXPIRES_KEY);
	if (!token || !expiresAt) return null;
	if (new Date(expiresAt).getTime() <= Date.now()) {
		clearSession();
		return null;
	}
	return { token, expiresAt };
}

export function setSession(session: StoredSession): void {
	window.localStorage.setItem(TOKEN_KEY, session.token);
	window.localStorage.setItem(EXPIRES_KEY, session.expiresAt);
}

export function clearSession(): void {
	window.localStorage.removeItem(TOKEN_KEY);
	window.localStorage.removeItem(EXPIRES_KEY);
}
