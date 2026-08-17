import {
	ApolloClient,
	ApolloLink,
	HttpLink,
	InMemoryCache,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { clearSession, getSession } from "@/lib/session";

// Relative URI on purpose: the Vite dev proxy (see vite.config.ts) and the
// production nginx config (see nginx.conf) both forward /graphql to hermes,
// so the browser never makes a cross-origin request and hermes never needs
// to grant CORS.
const httpLink = new HttpLink({ uri: "/graphql" });

const authLink = new ApolloLink((operation, forward) => {
	const session = getSession();
	if (session) {
		operation.setContext(({ headers = {} }) => ({
			headers: {
				...headers,
				Authorization: `Bearer ${session.token}`,
			},
		}));
	}
	return forward(operation);
});

// hermes never returns an HTTP 401 for a bad/expired session — it flags
// the request unauthenticated and lets public operations (register, login)
// still resolve (services/hermes/internal/auth/auth.go), so resolvers that
// require a principal surface it as a GraphQL error with
// extensions.code === "UNAUTHENTICATED" (errors.go). Catching it here is
// the one place the whole app needs to know that.
let onUnauthenticated: (() => void) | null = null;
export function setUnauthenticatedHandler(handler: () => void) {
	onUnauthenticated = handler;
}

const errorLink = onError(({ graphQLErrors }) => {
	if (
		graphQLErrors?.some((err) => err.extensions?.code === "UNAUTHENTICATED")
	) {
		clearSession();
		onUnauthenticated?.();
	}
});

export const apolloClient = new ApolloClient({
	link: ApolloLink.from([errorLink, authLink, httpLink]),
	cache: new InMemoryCache({
		typePolicies: {
			Content: { keyFields: ["mediaId"] },
			MediaProgress: { keyFields: ["mediaId"] },
			Query: {
				fields: {
					mediaList: {
						keyArgs: false,
						merge(existing, incoming, { args }) {
							if (!args?.cursor || !existing) return incoming;
							return {
								...incoming,
								items: [...existing.items, ...incoming.items],
							};
						},
					},
				},
			},
		},
	}),
});
