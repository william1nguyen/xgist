type ProductCardProps = {
	id: string;
	name: string;
	description: string | null;
	priceAmount: number;
	priceCurrency: string;
	isRecurring: boolean;
	onBuy: (productId: string) => void;
	loading: boolean;
};

function formatPrice(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
		minimumFractionDigits: 2,
	}).format(amount / 100);
}

export default function ProductCard({
	id,
	name,
	description,
	priceAmount,
	priceCurrency,
	isRecurring,
	onBuy,
	loading,
}: ProductCardProps) {
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
			<div className="space-y-1">
				<p className="font-semibold">{name}</p>
				{description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
			</div>
			<p className="font-bold text-2xl tabular-nums">
				{formatPrice(priceAmount, priceCurrency)}
				{isRecurring && (
					<span className="font-normal text-muted-foreground text-sm">
						{" "}
						/ mo
					</span>
				)}
			</p>
			<button
				type="button"
				disabled={loading}
				onClick={() => onBuy(id)}
				className="mt-auto w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{loading ? "Redirecting..." : isRecurring ? "Subscribe" : "Buy"}
			</button>
		</div>
	);
}
