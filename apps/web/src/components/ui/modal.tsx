import type React from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	actions?: React.ReactNode;
	icon?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
	isOpen,
	onClose,
	title,
	children,
	actions,
	icon,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
			<div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
			<div className="relative mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				{icon && (
					<div className="mb-4 flex items-center justify-center">{icon}</div>
				)}
				<h3 className="mb-2 text-center font-medium text-gray-900 text-lg">
					{title}
				</h3>
				<div className="mb-6">{children}</div>
				{actions && (
					<div className="flex justify-center space-x-3">{actions}</div>
				)}
			</div>
		</div>
	);
};
