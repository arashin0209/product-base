import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient, handleApiError, successResponse } from '@/lib/api-utils';
import { StripeClient } from '@/infrastructure/stripe/stripe.client';
import { UserService } from '@/application/user/user.service';
import { UserRepository } from '@/infrastructure/supabase/user.repository';
import { BillingService } from '@/application/billing/billing.service';
import { z } from 'zod';

const checkoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createPublicSupabaseClient();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { priceId, successUrl, cancelUrl } = checkoutSchema.parse(body);

    // サービスを初期化
    const stripeClient = new StripeClient();
    const userRepository = new UserRepository();
    const userService = new UserService(userRepository);
    const billingService = new BillingService(stripeClient, userService);

    // Checkoutセッションを作成
    const result = await billingService.createCheckoutSession(
      user.id,
      priceId,
      successUrl,
      cancelUrl
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 }
      );
    }

    return successResponse(result.data);
  } catch (error) {
    return handleApiError(error, 'Create checkout session');
  }
}
