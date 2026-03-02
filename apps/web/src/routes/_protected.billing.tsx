import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import type { CreditTransaction } from "@repo/types"
import type { AppRouterClient } from "@xgist/api/routers/index"
import { orpc, client } from "@/utils/orpc"
import BalanceCard from "@/components/billing/BalanceCard"
import ProductCard from "@/components/billing/ProductCard"
import TransactionRow from "@/components/billing/TransactionRow"

type ProductsResult = Awaited<ReturnType<AppRouterClient["billing"]["getProducts"]>>
type PolarProduct = ProductsResult["products"][number]

const HISTORY_LIMIT = 20

export default function BillingPage() {
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [allTransactions, setAllTransactions] = useState<CreditTransaction[]>([])

  const { data: balanceData } = useQuery(orpc.credits.getBalance.queryOptions({ input: {} }))
  const { data: productsData } = useQuery(orpc.billing.getProducts.queryOptions({ input: {} }))
  const { data: historyData, isFetching } = useQuery({
    ...orpc.credits.getHistory.queryOptions({
      input: { limit: HISTORY_LIMIT, cursor },
    }),
    placeholderData: (prev) => prev,
  })

  const transactions: CreditTransaction[] = historyData?.transactions ?? allTransactions

  const handleBuy = async (productId: string) => {
    setLoadingProductId(productId)
    try {
      const { checkoutUrl } = await client.billing.createCheckout({ productId })
      window.location.href = checkoutUrl
    } catch {
      toast.error("Failed to start checkout")
      setLoadingProductId(null)
    }
  }

  const handleLoadMore = () => {
    if (historyData?.nextCursor) {
      setAllTransactions((prev) => [...prev, ...(historyData.transactions ?? [])])
      setCursor(historyData.nextCursor)
    }
  }

  const products = productsData?.products ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-xl font-semibold">Credits & Billing</h1>

      <div className="grid grid-cols-2 gap-4">
        <BalanceCard label="Current Balance" amount={balanceData?.balance ?? 0} />
        <BalanceCard label="Total Spent" amount={balanceData?.totalSpent ?? 0} variant="spent" />
      </div>

      {products.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Top Up Credits</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {products.map((product: PolarProduct) => {
              const price = product.prices?.[0]
              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.description ?? null}
                  priceAmount={price?.priceAmount ?? 0}
                  priceCurrency={price?.priceCurrency ?? "usd"}
                  isRecurring={product.isRecurring ?? false}
                  onBuy={handleBuy}
                  loading={loadingProductId === product.id}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Transaction History</h2>
        <div className="rounded-xl border border-border bg-card px-4">
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </div>

        {historyData?.nextCursor && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isFetching}
            className="mt-2 w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {isFetching ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  )
}
