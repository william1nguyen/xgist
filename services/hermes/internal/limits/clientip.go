package limits

import "context"

type clientIPKey struct{}

// ContextWithClientIP attaches the caller's IP address to ctx, for
// rate-limit keys on pre-authentication operations (ClassAuthAttempt),
// where no user id exists yet.
func ContextWithClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, clientIPKey{}, ip)
}

// ClientIPFromContext returns the IP attached by ContextWithClientIP, or
// "" if none was attached.
func ClientIPFromContext(ctx context.Context) string {
	ip, _ := ctx.Value(clientIPKey{}).(string)
	return ip
}
