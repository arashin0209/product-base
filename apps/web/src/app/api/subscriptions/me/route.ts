import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient, handleApiError, successResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
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

    // ユーザーのサブスクリプション情報を取得
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    return successResponse(subscription || null);
  } catch (error) {
    return handleApiError(error, 'Get subscription');
  }
}
