import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import { CreateAudioDialog } from "@/components/audio/create-audio-dialog";
import { CreateMediaDialog } from "@/components/media/create-media-dialog";

type CreateDialogsContextValue = {
	openCreateMedia: () => void;
	openCreateAudio: () => void;
};

const CreateDialogsContext = createContext<CreateDialogsContextValue | null>(
	null,
);

// Mounts CreateMediaDialog and CreateAudioDialog once, high enough in the
// tree (around _protected.tsx's content) that any page — the top bar's
// Create dropdown, the dashboard's empty state, the Audio page — can open
// either one through the same context instead of each owning its own
// dialog instance or navigating to a dedicated route.
export function CreateDialogsProvider({ children }: { children: ReactNode }) {
	const [mediaOpen, setMediaOpen] = useState(false);
	const [audioOpen, setAudioOpen] = useState(false);

	const openCreateMedia = useCallback(() => setMediaOpen(true), []);
	const openCreateAudio = useCallback(() => setAudioOpen(true), []);

	return (
		<CreateDialogsContext.Provider value={{ openCreateMedia, openCreateAudio }}>
			{children}
			<CreateMediaDialog open={mediaOpen} onOpenChange={setMediaOpen} />
			<CreateAudioDialog open={audioOpen} onOpenChange={setAudioOpen} />
		</CreateDialogsContext.Provider>
	);
}

export function useCreateDialogs() {
	const ctx = useContext(CreateDialogsContext);
	if (!ctx) {
		throw new Error(
			"useCreateDialogs must be used within a CreateDialogsProvider",
		);
	}
	return ctx;
}
