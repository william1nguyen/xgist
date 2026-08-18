import { ApolloProvider } from "@apollo/client";
import type { ReactNode } from "react";
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { ThemeProvider } from "./components/layout/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { apolloClient } from "./graphql/client";
import { AuthProvider } from "./hooks/useAuth";
import "./i18n";
import "./index.css";

export function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Media Notes</title>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<ApolloProvider client={apolloClient}>
			<ThemeProvider>
				<AuthProvider>
					<Outlet />
					<Toaster />
				</AuthProvider>
			</ThemeProvider>
		</ApolloProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Something went wrong";
	let details = "An unexpected error occurred.";

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "Not found" : "Error";
		details =
			error.status === 404
				? "The page you're looking for doesn't exist."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error instanceof Error) {
		details = error.message;
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-2 p-4 text-center">
			<h1 className="font-semibold text-xl">{message}</h1>
			<p className="text-muted-foreground text-sm">{details}</p>
		</div>
	);
}
