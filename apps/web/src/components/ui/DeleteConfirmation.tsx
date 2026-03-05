import { AlertTriangle } from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";

import { Modal } from "./Modal";

interface DeleteConfirmationProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	itemCount: number;
	itemType: string;
}

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
	isOpen,
	onClose,
	onConfirm,
	itemCount,
	itemType,
}) => {
	const { t } = useTranslation(["common"]);

	const icon = (
		<div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
			<AlertTriangle className="text-red-600" size={24} />
		</div>
	);

	const actions = (
		<>
			<button
				onClick={onClose}
				className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
			>
				{t("cancel")}
			</button>
			<button
				onClick={onConfirm}
				className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
			>
				{t("delete")}
			</button>
		</>
	);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={t("deleteConfirmation.title")}
			icon={icon}
			actions={actions}
		>
			<p className="text-center text-gray-500">
				{t("deleteConfirmation.message", {
					count: itemCount,
					type: t(`itemTypes.${itemType}`, { count: itemCount }),
				})}
			</p>
		</Modal>
	);
};
