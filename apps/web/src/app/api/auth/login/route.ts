import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient, handleApiError, successResponse } from '@/lib/api-utils';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const supabase = createPublicSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return successResponse({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    return handleApiError(error, 'Login');
  }
}
