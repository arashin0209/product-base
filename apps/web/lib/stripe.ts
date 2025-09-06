import Stripe from 'stripe'

// Create Stripe client
export const createStripeClient = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  
  if (!stripeSecretKey) {
    // CI/Vercel環境では環境変数がない場合があるため、モックを返す
    if (process.env.CI || process.env.VERCEL) {
      return {
        checkout: {
          sessions: {
            create: () => Promise.resolve({ url: 'https://mock-checkout.stripe.com', id: 'mock_session' })
          }
        }
      } as any
    }
    throw new Error('STRIPE_SECRET_KEY environment variable is required')
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  })
}

// Legacy export for backward compatibility
export const stripe = createStripeClient()

// Get Stripe price IDs
export const getStripePrices = () => {
  const priceIds = {
    gold_monthly: process.env.STRIPE_GOLD_PRICE_ID || 'mock_gold_monthly',
    gold_yearly: process.env.STRIPE_GOLD_YEARLY_PRICE_ID || 'mock_gold_yearly',
    platinum_monthly: process.env.STRIPE_PLATINUM_PRICE_ID || 'mock_platinum_monthly',
    platinum_yearly: process.env.STRIPE_PLATINUM_YEARLY_PRICE_ID || 'mock_platinum_yearly',
  } as const

  // Skip validation in CI/Vercel environments
  if (process.env.CI || process.env.VERCEL) {
    return priceIds
  }

  // Validate that price IDs are configured in production
  if (!process.env.STRIPE_GOLD_PRICE_ID || !process.env.STRIPE_PLATINUM_PRICE_ID) {
    throw new Error('Stripe price IDs must be configured in environment variables')
  }

  return priceIds
}

// Legacy export for backward compatibility
export const STRIPE_PRICES = getStripePrices()