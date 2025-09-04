import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient, handleApiError, successResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    const supabase = createPublicSupabaseClient();

    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('id');

    if (error) {
      console.error('Error fetching plans:', error);
      // フォールバック: デフォルトプラン情報を返す
      const fallbackPlans = [
        {
          id: 'free',
          name: 'Free',
          description: '基本的な機能をお楽しみいただけます',
          stripePriceId: null,
          active: true,
          features: {
            ai_requests: false,
            export_csv: false,
            custom_theme: false,
            priority_support: false,
            advanced_analytics: false,
          },
        },
        {
          id: 'gold',
          name: 'Gold',
          description: '高度な機能が利用できます',
          stripePriceId: process.env.STRIPE_GOLD_PRICE_ID || null,
          active: true,
          features: {
            ai_requests: true,
            export_csv: true,
            custom_theme: false,
            priority_support: false,
            advanced_analytics: false,
          },
        },
        {
          id: 'platinum',
          name: 'Platinum',
          description: 'すべての機能を無制限でご利用いただけます',
          stripePriceId: process.env.STRIPE_PLATINUM_PRICE_ID || null,
          active: true,
          features: {
            ai_requests: true,
            export_csv: true,
            custom_theme: true,
            priority_support: true,
            advanced_analytics: true,
          },
        },
      ];
      return successResponse({ plans: fallbackPlans });
    }

    return successResponse({ plans: plans || [] });
  } catch (error) {
    return handleApiError(error, 'Get plans');
  }
}
