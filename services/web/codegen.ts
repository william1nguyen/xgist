import type { CodegenConfig } from "@graphql-codegen/cli";

// Points at hermes's schema file directly rather than introspecting a
// running server — build-time only, no runtime coupling to the Go module.
const config: CodegenConfig = {
	schema: "../../services/hermes/internal/graphql/schema.graphqls",
	documents: ["src/graphql/operations/**/*.graphql"],
	generates: {
		"src/graphql/generated/graphql.tsx": {
			plugins: [
				"typescript",
				"typescript-operations",
				"typescript-react-apollo",
			],
			config: {
				withHooks: true,
				withHOC: false,
				withComponent: false,
				reactApolloVersion: 3,
				scalars: {
					ID: "string",
				},
			},
		},
	},
};

export default config;
