package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
)

const (
	sandboxBaseURL    = "https://sandbox-api.polar.sh"
	productionBaseURL = "https://api.polar.sh"
)

// PolarClient calls Polar's REST API (checkout creation, product listing,
// subscription cancellation) — the outbound half of the Polar integration,
// alongside PolarHandler's inbound webhook handling. There is no official
// Polar Go SDK, so this is a small hand-rolled client over net/http,
// matching PolarHandler's own no-SDK approach.
type PolarClient struct {
	baseURL     string
	accessToken string
	httpClient  *http.Client
}

// NewPolarClient returns a PolarClient. server selects Polar's sandbox or
// production API — any value other than "production" is treated as
// sandbox, so an empty or misconfigured value fails safely toward the
// environment that can't move real money.
func NewPolarClient(server, accessToken string) *PolarClient {
	baseURL := sandboxBaseURL
	if server == "production" {
		baseURL = productionBaseURL
	}
	return &PolarClient{baseURL: baseURL, accessToken: accessToken, httpClient: &http.Client{}}
}

// Plan is one subscribable Polar product.
type Plan struct {
	ID                string
	Name              string
	Description       string
	PriceAmount       int64
	PriceCurrency     string
	RecurringInterval string
	Benefits          []string
}

type polarPrice struct {
	AmountType    string `json:"amount_type"`
	PriceAmount   int64  `json:"price_amount"`
	PriceCurrency string `json:"price_currency"`
}

type polarBenefit struct {
	Description string `json:"description"`
}

type polarProduct struct {
	ID                string         `json:"id"`
	Name              string         `json:"name"`
	Description       string         `json:"description"`
	IsRecurring       bool           `json:"is_recurring"`
	IsArchived        bool           `json:"is_archived"`
	RecurringInterval string         `json:"recurring_interval"`
	Metadata          metadata       `json:"metadata"`
	Prices            []polarPrice   `json:"prices"`
	Benefits          []polarBenefit `json:"benefits"`
}

type polarProductListResponse struct {
	Items []polarProduct `json:"items"`
}

// fixedPrice returns p's fixed price, if it has one — a product with only
// a pay-what-you-want or custom price returns zero values, which callers
// treat as "no fixed price configured" rather than a literal free price.
func fixedPrice(p polarProduct) (amount int64, currency string) {
	for _, price := range p.Prices {
		if price.AmountType == "fixed" {
			return price.PriceAmount, price.PriceCurrency
		}
	}
	return 0, ""
}

// listProducts fetches every active, non-archived Polar product — the
// shared fetch behind ListPlans and ListCreditPacks, which each filter
// and map the same list differently. is_archived is also filtered
// server-side via the query string, but callers re-check it since
// is_recurring can't be filtered that way in one request.
func (c *PolarClient) listProducts(ctx context.Context) ([]polarProduct, error) {
	var resp polarProductListResponse
	if err := c.do(ctx, http.MethodGet, "/v1/products/?is_archived=false&limit=100", nil, &resp); err != nil {
		return nil, fmt.Errorf("list polar products: %w", err)
	}
	return resp.Items, nil
}

// ListPlans returns every active, non-archived, recurring Polar product —
// the live plan catalog, per billing.proto's ListPlans comment.
func (c *PolarClient) ListPlans(ctx context.Context) ([]Plan, error) {
	products, err := c.listProducts(ctx)
	if err != nil {
		return nil, err
	}

	plans := make([]Plan, 0, len(products))
	for _, p := range products {
		if !p.IsRecurring || p.IsArchived {
			continue
		}
		plan := Plan{
			ID:                p.ID,
			Name:              p.Name,
			Description:       p.Description,
			RecurringInterval: p.RecurringInterval,
		}
		plan.PriceAmount, plan.PriceCurrency = fixedPrice(p)
		for _, b := range p.Benefits {
			plan.Benefits = append(plan.Benefits, b.Description)
		}
		plans = append(plans, plan)
	}
	// Cheapest first: Polar's product listing order reflects creation
	// order, not price, which reads as arbitrary in a pricing picker.
	sort.Slice(plans, func(i, j int) bool { return plans[i].PriceAmount < plans[j].PriceAmount })
	return plans, nil
}

// CreditPack is one one-time, non-recurring Polar product configured to
// grant a fixed number of credits on purchase (its metadata.credits) —
// the live top-up catalog, read the same way ListPlans reads subscription
// plans: never a locally configured list.
type CreditPack struct {
	ID            string
	Name          string
	Description   string
	Credits       int64
	PriceAmount   int64
	PriceCurrency string
}

// ListCreditPacks returns every active, non-archived, non-recurring Polar
// product that has a positive metadata.credits — a non-recurring product
// without that metadata isn't a credit top-up (e.g. some other one-time
// good) and is silently excluded rather than surfaced as a malformed
// pack, since PolarHandler's order.created path already treats a missing
// or non-positive credits metadata as "not billing's concern to grant."
func (c *PolarClient) ListCreditPacks(ctx context.Context) ([]CreditPack, error) {
	products, err := c.listProducts(ctx)
	if err != nil {
		return nil, err
	}

	packs := make([]CreditPack, 0, len(products))
	for _, p := range products {
		if p.IsRecurring || p.IsArchived {
			continue
		}
		credits, err := strconv.ParseInt(p.Metadata.String("credits"), 10, 64)
		if err != nil || credits <= 0 {
			continue
		}
		pack := CreditPack{
			ID:          p.ID,
			Name:        p.Name,
			Description: p.Description,
			Credits:     credits,
		}
		pack.PriceAmount, pack.PriceCurrency = fixedPrice(p)
		packs = append(packs, pack)
	}
	// Cheapest first, same reasoning as ListPlans's sort.
	sort.Slice(packs, func(i, j int) bool { return packs[i].PriceAmount < packs[j].PriceAmount })
	return packs, nil
}

type createCheckoutRequest struct {
	Products      []string          `json:"products"`
	SuccessURL    string            `json:"success_url"`
	CustomerEmail string            `json:"customer_email"`
	Metadata      map[string]string `json:"metadata"`
}

type checkoutResponse struct {
	URL string `json:"url"`
}

// CreateCheckout starts a Polar-hosted checkout for productID and returns
// its URL. metadata is carried by Polar onto the resulting order and
// subscription webhook events unchanged — PolarHandler relies on
// metadata["userId"] being set here to resolve those events back to a
// user (see handleOrderCreated/handleSubscriptionEvent).
func (c *PolarClient) CreateCheckout(ctx context.Context, productID, successURL, customerEmail string, metadata map[string]string) (string, error) {
	req := createCheckoutRequest{
		Products:      []string{productID},
		SuccessURL:    successURL,
		CustomerEmail: customerEmail,
		Metadata:      metadata,
	}
	var resp checkoutResponse
	if err := c.do(ctx, http.MethodPost, "/v1/checkouts/", req, &resp); err != nil {
		return "", fmt.Errorf("create polar checkout: %w", err)
	}
	return resp.URL, nil
}

type updateSubscriptionRequest struct {
	CancelAtPeriodEnd bool `json:"cancel_at_period_end"`
}

// CancelAtPeriodEnd schedules subscriptionID to end at the close of its
// current billing period, rather than revoking it immediately. The local
// billing.subscriptions row is not updated here — Polar reports the
// resulting subscription.updated webhook asynchronously, the same path
// every other subscription state change reaches billing through.
func (c *PolarClient) CancelAtPeriodEnd(ctx context.Context, subscriptionID string) error {
	req := updateSubscriptionRequest{CancelAtPeriodEnd: true}
	path := fmt.Sprintf("/v1/subscriptions/%s", subscriptionID)
	if err := c.do(ctx, http.MethodPatch, path, req, nil); err != nil {
		return fmt.Errorf("cancel polar subscription: %w", err)
	}
	return nil
}

func (c *PolarClient) do(ctx context.Context, method, path string, body, out any) error {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reqBody)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.accessToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("polar api %s %s: status %d: %s", method, path, resp.StatusCode, string(respBody))
	}

	if out == nil || len(respBody) == 0 {
		return nil
	}
	return json.Unmarshal(respBody, out)
}
