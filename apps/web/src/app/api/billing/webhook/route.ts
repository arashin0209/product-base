import { NextRequest, NextResponse } from 'next/server';
import { StripeClient } from '@/infrastructure/stripe/stripe.client';
import { UserService } from '@/application/user/user.service';
import { UserRepository } from '@/infrastructure/supabase/user.repository';
import { BillingService } from '@/application/billing/billing.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Stripeクライアントを初期化
    const stripeClient = new StripeClient();

    // Webhookイベントを検証
    const event = await stripeClient.constructWebhookEvent(body, signature);

    // サービスを初期化
    const userRepository = new UserRepository();
    const userService = new UserService(userRepository);
    const billingService = new BillingService(stripeClient, userService);

    // イベントを処理
    const result = await billingService.handleWebhookEvent(event);

    if (!result.success) {
      console.error('Webhook handling failed:', result.error);
      return NextResponse.json(
        { error: 'Webhook handling failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
