import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// The client only ever calls a relative /graphql — this proxy keeps that
// true in dev too, so hermes never needs to grant CORS. Production reaches
// hermes the same way, through nginx (see nginx.conf).
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const hermesUrl = env.VITE_HERMES_URL || "http://localhost:8086";

	return {
		plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
		// react-router's SPA-mode build prerenders once in a Node SSR
		// environment even with ssr:false. @apollo/client 3.14 ships no
		// package.json "exports" map, so Node's native ESM loader can't
		// resolve its named exports from the raw import left by an
		// externalized SSR bundle — inlining it here avoids that entirely.
		ssr: {
			noExternal: ["@apollo/client"],
		},
		server: {
			proxy: {
				"/graphql": {
					target: hermesUrl,
					changeOrigin: true,
				},
			},
		},
	};
});
