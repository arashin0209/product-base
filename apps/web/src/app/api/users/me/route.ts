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

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return successResponse({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      planType: userData.plan_type || 'free',
      planStatus: userData.plan_status || 'active',
      stripeCustomerId: userData.stripe_customer_id,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    });
  } catch (error) {
    return handleApiError(error, 'Get current user');
  }
}
