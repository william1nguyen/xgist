import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";

type SettingsDialogContextValue = {
	openSettings: () => void;
};

const SettingsDialogContext = createContext<SettingsDialogContextValue | null>(
	null,
);

// Mounts SettingsDialog once, high enough in the tree (around
// _protected.tsx's content) that any page — the sidebar's account menu,
// eventually anywhere else — can open it through this context instead of
// navigating to a dedicated /settings route.
export function SettingsDialogProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const openSettings = useCallback(() => setOpen(true), []);

	return (
		<SettingsDialogContext.Provider value={{ openSettings }}>
			{children}
			<SettingsDialog open={open} onOpenChange={setOpen} />
		</SettingsDialogContext.Provider>
	);
}

export function useSettingsDialog() {
	const ctx = useContext(SettingsDialogContext);
	if (!ctx) {
		throw new Error(
			"useSettingsDialog must be used within a SettingsDialogProvider",
		);
	}
	return ctx;
}
