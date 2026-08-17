import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: "jsdom",
		environmentOptions: {
			jsdom: { url: "http://localhost:3000" },
		},
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
	},
});
