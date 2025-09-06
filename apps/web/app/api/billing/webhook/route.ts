import { NextRequest } from 'next/server'
import { stripe } from '../../../../lib/stripe'
import { db } from '../../../../../../src/infrastructure/database/connection'
import { users, userSubscriptions } from '../../../../../../src/infrastructure/database/schema'
import { handleAPIError } from '../../../../../../src/shared/errors'
import { eq, and } from 'drizzle-orm'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!
    
    let event: Stripe.Event
    
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }
    
    console.log('Processing webhook event:', event.type)
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return Response.json({ received: true })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return handleAPIError(error)
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id
  const planId = subscription.metadata.plan_id
  
  if (!userId || !planId) {
    console.error('Missing user_id or plan_id in subscription metadata')
    return
  }
  
  await db.transaction(async (tx) => {
    // Update user's plan
    await tx
      .update(users)
      .set({ planType: planId })
      .where(eq(users.id, userId))
    
    // Upsert subscription record
    const existingSubscription = await tx
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id))
      .limit(1)
    
    const subscriptionData = {
      userId,
      planId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    }
    
    if (existingSubscription.length > 0) {
      await tx
        .update(userSubscriptions)
        .set(subscriptionData)
        .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id))
    } else {
      await tx
        .insert(userSubscriptions)
        .values(subscriptionData)
    }
  })
  
  console.log(`Subscription updated for user ${userId}: ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id
  
  if (!userId) {
    console.error('Missing user_id in subscription metadata')
    return
  }
  
  await db.transaction(async (tx) => {
    // Update user to free plan
    await tx
      .update(users)
      .set({ planType: 'free' })
      .where(eq(users.id, userId))
    
    // Mark subscription as canceled
    await tx
      .update(userSubscriptions)
      .set({ 
        status: 'canceled',
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id))
  })
  
  console.log(`Subscription canceled for user ${userId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  
  // Update subscription status to active
  await db
    .update(userSubscriptions)
    .set({ 
      status: 'active',
      updatedAt: new Date()
    })
    .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription as string))
  
  console.log(`Payment succeeded for subscription ${invoice.subscription}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  
  // Update subscription status to past_due
  await db
    .update(userSubscriptions)
    .set({ 
      status: 'past_due',
      updatedAt: new Date()
    })
    .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription as string))
  
  console.log(`Payment failed for subscription ${invoice.subscription}`)
}