import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient, handleApiError, successResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const supabase = createPublicSupabaseClient();
    const { email, name, planType, userId } = await req.json();

    if (!email || !name || !userId) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and userId are required' },
        { status: 400 }
      );
    }

    // ユーザーレコードを作成
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId, // Supabase auth.users の ID を使用
        email,
        name,
        plan_type: planType || 'free',
        plan_status: 'active',
      })
      .select()
      .single();

    if (userError) {
      console.error('Database error:', userError);
      return NextResponse.json(
        { success: false, error: `Database error: ${userError.message}` },
        { status: 500 }
      );
    }

    return successResponse({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      planType: userData.plan_type,
      planStatus: userData.plan_status,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    });
  } catch (error) {
    return handleApiError(error, 'Create user');
  }
}