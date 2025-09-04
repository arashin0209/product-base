import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/supabase.client';
import { AuthenticationError, ValidationError } from '@/shared/errors';

export function createPublicSupabaseClient() {
  return createServerSupabaseClient();
}

export async function authenticateUser(req: NextRequest) {
  const supabase = createPublicSupabaseClient();
  
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Authorization header missing or invalid');
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthenticationError('Invalid token');
  }

  return { user };
}

export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(error: string, statusCode: number = 500) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status: statusCode }
  );
}

export function handleApiError(error: unknown, context: string) {
  console.error(`${context} error:`, error);

  if (error instanceof ValidationError) {
    return errorResponse(error.message, 400);
  }

  if (error instanceof AuthenticationError) {
    return errorResponse(error.message, 401);
  }

  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }

  return errorResponse('Internal server error', 500);
}

export function validateRequestBody<T>(body: unknown, schema: any): T {
  try {
    return schema.parse(body);
  } catch (error) {
    throw new ValidationError('Invalid request body');
  }
}
