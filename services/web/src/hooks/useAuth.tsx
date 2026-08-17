import { useApolloClient } from "@apollo/client";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { setUnauthenticatedHandler } from "@/graphql/client";
import {
	type MeQuery,
	useLoginMutation,
	useLogoutMutation,
	useMeLazyQuery,
	useRegisterMutation,
} from "@/graphql/generated/graphql";
import { clearSession, getSession, setSession } from "@/lib/session";

type User = MeQuery["me"];

type AuthContextValue = {
	user: User | null;
	loading: boolean;
	login: (email: string, password: string) => Promise<void>;
	register: (email: string, password: string, name: string) => Promise<void>;
	logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const location = useLocation();
	const apollo = useApolloClient();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [loginMutation] = useLoginMutation();
	const [registerMutation] = useRegisterMutation();
	const [logoutMutation] = useLogoutMutation();
	const [fetchMe] = useMeLazyQuery({ fetchPolicy: "network-only" });

	const handleUnauthenticated = useCallback(() => {
		setUser(null);
		const redirect = encodeURIComponent(location.pathname + location.search);
		navigate(`/login?redirect=${redirect}`, { replace: true });
	}, [navigate, location]);

	useEffect(() => {
		setUnauthenticatedHandler(handleUnauthenticated);
	}, [handleUnauthenticated]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: must run once on mount only — fetchMe's identity is not stable across renders, so including it would refetch on every render.
	useEffect(() => {
		let cancelled = false;
		async function bootstrap() {
			if (!getSession()) {
				setLoading(false);
				return;
			}
			try {
				const { data } = await fetchMe();
				if (!cancelled) setUser(data?.me ?? null);
			} catch {
				if (!cancelled) setUser(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		bootstrap();
		return () => {
			cancelled = true;
		};
	}, []);

	const login = useCallback(
		async (email: string, password: string) => {
			const { data } = await loginMutation({ variables: { email, password } });
			if (!data?.login) throw new Error("Login failed");
			setSession({
				token: data.login.sessionToken,
				expiresAt: data.login.expiresAt,
			});
			setUser(data.login.user);
		},
		[loginMutation],
	);

	const register = useCallback(
		// register does not issue a session (services/hermes: schema.graphqls'
		// comment on `register`), so the caller chains straight into login.
		async (email: string, password: string, name: string) => {
			await registerMutation({ variables: { email, password, name } });
			await login(email, password);
		},
		[registerMutation, login],
	);

	const logout = useCallback(async () => {
		try {
			await logoutMutation();
		} finally {
			clearSession();
			setUser(null);
			await apollo.clearStore();
			navigate("/login", { replace: true });
		}
	}, [logoutMutation, apollo, navigate]);

	return (
		<AuthContext.Provider value={{ user, loading, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
