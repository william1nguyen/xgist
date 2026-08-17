import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStep = {
	id: string;
	label: string;
};

export function StepIndicator({
	steps,
	currentId,
	furthestIndex,
	onJump,
}: {
	steps: WizardStep[];
	currentId: string;
	furthestIndex: number;
	onJump: (id: string) => void;
}) {
	const currentIndex = steps.findIndex((s) => s.id === currentId);

	return (
		<ol className="flex items-center">
			{steps.map((step, index) => {
				const isCompleted = index < currentIndex;
				const isCurrent = index === currentIndex;
				const isReachable = index <= furthestIndex;

				return (
					<li key={step.id} className="flex flex-1 items-center last:flex-none">
						<button
							type="button"
							disabled={!isReachable}
							onClick={() => isReachable && onJump(step.id)}
							className="flex items-center gap-2.5 disabled:cursor-not-allowed"
						>
							<span
								className={cn(
									"flex size-7 shrink-0 items-center justify-center rounded-full font-medium text-xs transition-colors",
									isCompleted
										? "bg-primary text-primary-foreground"
										: isCurrent
											? "border-2 border-primary text-primary"
											: "border-2 border-border text-muted-foreground",
								)}
							>
								{isCompleted ? <Check className="size-3.5" /> : index + 1}
							</span>
							<span
								className={cn(
									"whitespace-nowrap font-medium text-sm",
									isCurrent
										? "text-foreground"
										: isCompleted
											? "text-foreground/80"
											: "text-muted-foreground",
								)}
							>
								{step.label}
							</span>
						</button>
						{index < steps.length - 1 && (
							<div
								className={cn(
									"mx-3 h-px flex-1",
									index < currentIndex ? "bg-primary" : "bg-border",
								)}
							/>
						)}
					</li>
				);
			})}
		</ol>
	);
}
