import { z } from 'zod';

export const emailSchema = z.string().email('有効なメールアドレスを入力してください');
export const passwordSchema = z.string().min(6, 'パスワードは6文字以上で入力してください');
export const nameSchema = z.string().min(1, '名前を入力してください').max(50, '名前は50文字以内で入力してください');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
});

export const checkoutSchema = z.object({
  priceId: z.string().min(1, '価格IDが必要です'),
  successUrl: z.string().url('有効なURLを入力してください'),
  cancelUrl: z.string().url('有効なURLを入力してください'),
});

export const portalSchema = z.object({
  returnUrl: z.string().url('有効なURLを入力してください'),
});
