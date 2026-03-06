import "./index.css";
import { StrictMode, startTransition } from "react";
import { createRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

startTransition(() => {
	createRoot(rootElement).render(
		<StrictMode>
			<HydratedRouter />
		</StrictMode>,
	);
});
