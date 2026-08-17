import type { Config } from "@react-router/dev/config";

export default {
	// Pure client-rendered SPA: the session lives in localStorage and every
	// data dependency is a GraphQL call to hermes, so there is no server-side
	// data loading to gain from SSR here. Matches how the app is deployed —
	// static files behind nginx (see nginx.conf), no Node runtime.
	ssr: false,
	appDirectory: "src",
} satisfies Config;
