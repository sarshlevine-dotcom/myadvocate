# Billing — Sharp Edge

ALL subscription updates flow through Stripe webhooks ONLY.
Never update subscription status directly from UI actions.
Webhook signature must be verified on every request (MA-SEC-002 P17).
