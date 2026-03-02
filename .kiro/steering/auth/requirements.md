# Spec: Auth (Better Auth)

## Routes
- `/login` — email/password + Google OAuth
- `/register` — email/password signup
- `/auth/callback` — OAuth callback (handled by Better Auth)

## Requirements

- [ ] Better Auth configured with email/password provider
- [ ] Google OAuth provider (optional but scaffold ready)
- [ ] Session cookie-based auth
- [ ] `userId` injected into oRPC context via session middleware
- [ ] Protected routes redirect to `/login` if unauthenticated
- [ ] On first signup: create `credits` row with `balance: 50` (welcome bonus)

## oRPC Context Setup

```ts
// apps/server/src/lib/context.ts
export type AppContext = {
  userId: string | null
  db: DrizzleDB
  redis: Redis
}

export const authedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new ORPCError("UNAUTHORIZED")
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})
```

## Better Auth Config

```ts
// apps/server/src/lib/auth.ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
})
```

## UI
- Login and register forms: clean, centered card layout
- Show validation errors inline
- Loading state on submit button
- "Don't have an account? Sign up" / "Already have one? Login" toggle links
