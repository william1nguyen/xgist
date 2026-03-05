import { useEffect } from "react";
import { NavLink, useSearchParams } from "react-router";
import { toast } from "sonner";

export default function BillingCheckoutPage() {
	const [searchParams] = useSearchParams();
	const success = searchParams.get("success") === "true";

	useEffect(() => {
		if (success) {
			toast.success("Payment successful — credits will appear shortly");
		}
	}, [success]);

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
			{success ? (
				<>
					<p className="font-semibold text-lg">Payment received</p>
					<p className="text-muted-foreground text-sm">
						Your credits will be added once the payment is confirmed.
					</p>
				</>
			) : (
				<p className="text-muted-foreground text-sm">Checkout cancelled.</p>
			)}
			<NavLink to="/billing" className="text-primary text-sm hover:underline">
				← Back to billing
			</NavLink>
		</div>
	);
}
