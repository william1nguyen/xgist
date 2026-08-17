import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
	className,
	...props
}: ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			className={cn(
				"inline-flex items-center gap-1 border-border border-b",
				className,
			)}
			{...props}
		/>
	);
}

export function TabsTrigger({
	className,
	...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			className={cn(
				"px-3 py-2 text-muted-foreground text-sm transition-colors data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:font-medium data-[state=active]:text-foreground hover:text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export function TabsContent({
	className,
	...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
	return <TabsPrimitive.Content className={cn("mt-3", className)} {...props} />;
}
