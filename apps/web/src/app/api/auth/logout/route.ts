import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient, handleApiError, successResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const supabase = createPublicSupabaseClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return successResponse({ message: 'Logged out successfully' });
  } catch (error) {
    return handleApiError(error, 'Logout');
  }
}
