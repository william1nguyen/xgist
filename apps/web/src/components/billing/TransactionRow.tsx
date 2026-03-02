import type { CreditTransaction } from "@repo/types"

type TransactionRowProps = {
  transaction: CreditTransaction
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date))
}

function reasonLabel(reason: string, metadata: CreditTransaction["metadata"]): string {
  if (reason === "polar_purchase") return "Credit top-up"
  if (reason === "job_deduction") {
    const title = metadata?.["videoTitle"]
    return title ? `Processing: ${String(title)}` : "Processing"
  }
  return reason
}

export default function TransactionRow({ transaction }: TransactionRowProps) {
  const positive = transaction.delta > 0

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-4">
        <span className="w-12 shrink-0 text-xs text-muted-foreground">
          {formatDate(transaction.createdAt)}
        </span>
        <span className="text-sm">{reasonLabel(transaction.reason, transaction.metadata)}</span>
      </div>
      <span
        className={`tabular-nums text-sm font-medium ${positive ? "text-green-400" : "text-red-400"}`}
      >
        {positive ? "+" : ""}
        {transaction.delta}c
      </span>
    </div>
  )
}
