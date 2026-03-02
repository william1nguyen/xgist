type ProductCardProps = {
  id: string
  name: string
  description: string | null
  priceAmount: number
  priceCurrency: string
  isRecurring: boolean
  onBuy: (productId: string) => void
  loading: boolean
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100)
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
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="space-y-1">
        <p className="font-semibold">{name}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums">
        {formatPrice(priceAmount, priceCurrency)}
        {isRecurring && <span className="text-sm font-normal text-muted-foreground"> / mo</span>}
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => onBuy(id)}
        className="mt-auto w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : isRecurring ? "Subscribe" : "Buy"}
      </button>
    </div>
  )
}
