import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required')
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
})

// Price IDs from environment variables
export const STRIPE_PRICES = {
  gold_monthly: process.env.STRIPE_GOLD_PRICE_ID!,
  gold_yearly: process.env.STRIPE_GOLD_YEARLY_PRICE_ID!,
  platinum_monthly: process.env.STRIPE_PLATINUM_PRICE_ID!,
  platinum_yearly: process.env.STRIPE_PLATINUM_YEARLY_PRICE_ID!,
} as const

// Debug: Log environment variables
console.log('Stripe Price IDs:', {
  gold_monthly: process.env.STRIPE_GOLD_PRICE_ID,
  gold_yearly: process.env.STRIPE_GOLD_YEARLY_PRICE_ID,
  platinum_monthly: process.env.STRIPE_PLATINUM_PRICE_ID,
  platinum_yearly: process.env.STRIPE_PLATINUM_YEARLY_PRICE_ID,
})

// Validate that price IDs are configured
if (!STRIPE_PRICES.gold_monthly || !STRIPE_PRICES.platinum_monthly) {
  console.error('Missing Stripe price IDs:', {
    gold_monthly: STRIPE_PRICES.gold_monthly,
    platinum_monthly: STRIPE_PRICES.platinum_monthly,
  })
  throw new Error('Stripe price IDs must be configured in environment variables')
}