import { Folder } from "lucide-react";
import type React from "react";

interface EmptyStateProps {
	title: string;
	description: string;
	actionButton?: React.ReactNode;
	icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	title,
	description,
	actionButton,
	icon = <Folder className="text-gray-400" size={28} />,
}) => {
	return (
		<div className="py-16 text-center">
			<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
				{icon}
			</div>
			<h3 className="mb-1 font-medium text-gray-900 text-lg">{title}</h3>
			<p className="mb-6 text-gray-500">{description}</p>
			{actionButton}
		</div>
	);
};
