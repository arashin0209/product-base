import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient, handleApiError, successResponse } from '@/lib/api-utils';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = signupSchema.parse(body);

    const supabase = createPublicSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
          plan: 'free',
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // ユーザーレコードを作成
    if (data.user) {
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          name: name || email.split('@')[0],
          plan_type: 'free',
          plan_status: 'active',
        });

      if (userError) {
        console.error('Failed to create user record:', userError);
      }
    }

    return successResponse({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    return handleApiError(error, 'Signup');
  }
}
