# Spec: Billing & Credits Dashboard

## Routes
- `/billing` — credits history, balance, top-up
- `/billing/checkout?productId=...` — Polar checkout redirect (server-side)

## Requirements

### Balance Section
- [ ] Show current credit balance prominently
- [ ] Show total credits spent (sum of negative transactions)
- [ ] Link to purchase more credits

### Products / Top-up
- [ ] Fetch available Polar products via `billing.getProducts`
- [ ] Display each product: name, credit amount, price
- [ ] "Buy" button → calls `billing.createCheckout` → redirect to Polar sandbox checkout URL
- [ ] After Polar redirects back, show success toast (Polar webhook handles actual credit grant)

### Transaction History
- [ ] Paginated list of `credit_transactions`
- [ ] Each row: date, reason, delta (green for positive, red for negative), running context
- [ ] Reason strings to display:
  - `"polar_purchase"` → "Credit top-up"
  - `"job_deduction"` → "Processing: {videoTitle}" (from metadata)

### UI Layout
```
┌─────────────────────────────────────────────────────┐
│  Credits & Billing                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Current Balance│  │  Total Spent            │  │
│  │                 │  │                         │  │
│  │    ◆ 120        │  │    ◆ 340                │  │
│  │    credits      │  │    credits              │  │
│  └─────────────────┘  └─────────────────────────┘  │
│                                                     │
│  Top Up Credits                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Starter  │  │  Pro     │  │  Monthly Sub     │  │
│  │ 100c     │  │  500c    │  │  200c / month    │  │
│  │ $4.99    │  │  $19.99  │  │  $9.99           │  │
│  │ [Buy]    │  │  [Buy]   │  │  [Subscribe]     │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                     │
│  Transaction History                                │
│  ┌────────────────────────────────────────────────┐ │
│  │ Mar 1   Credit top-up             +100c        │ │
│  │ Mar 1   Processing: interview.mp4  -35c        │ │
│  │ Feb 28  Processing: podcast.mp3    -55c        │ │
│  │ Feb 28  Credit top-up             +100c        │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Visual Style
- Balance cards: large number, subtle gradient background, credit gem icon
- Product cards: outlined, hover lifts with shadow, price prominent
- Transactions: clean table, delta colored (green/red), no borders — dividers only
- Responsive: product cards wrap on mobile

## oRPC Endpoints

```ts
credits.getBalance  // {} → { balance: number, totalSpent: number }
credits.getHistory  // { limit: number, cursor?: string } → { transactions: CreditTransaction[], nextCursor: string | null }
billing.getProducts // {} → { products: PolarProduct[] }
billing.createCheckout // { productId: string } → { checkoutUrl: string }
```
