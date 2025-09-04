import { supabase } from './supabase.client';
import { User, UserCreateInput, UserUpdateInput } from '@/domain/user/user.entity';
import { Result, success, failure } from '@/shared/result';
import { NotFoundError } from '@/shared/errors';

export class UserRepository {
  async findById(id: string): Promise<Result<User, Error>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return failure(new NotFoundError('User not found'));
        }
        return failure(new Error(error.message));
      }

      const user = new User(
        data.id,
        data.email,
        data.name,
        data.plan_type || 'free',
        data.plan_status || 'active',
        data.stripe_customer_id,
        data.created_at ? new Date(data.created_at) : undefined,
        data.updated_at ? new Date(data.updated_at) : undefined
      );

      return success(user);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async findByEmail(email: string): Promise<Result<User, Error>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return failure(new NotFoundError('User not found'));
        }
        return failure(new Error(error.message));
      }

      const user = new User(
        data.id,
        data.email,
        data.name,
        data.plan_type || 'free',
        data.plan_status || 'active',
        data.stripe_customer_id,
        data.created_at ? new Date(data.created_at) : undefined,
        data.updated_at ? new Date(data.updated_at) : undefined
      );

      return success(user);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async create(input: UserCreateInput): Promise<Result<User, Error>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: input.email,
          name: input.name,
          plan_type: input.planType || 'free',
          plan_status: 'active',
        })
        .select()
        .single();

      if (error) {
        return failure(new Error(error.message));
      }

      const user = new User(
        data.id,
        data.email,
        data.name,
        data.plan_type || 'free',
        data.plan_status || 'active',
        data.stripe_customer_id,
        data.created_at ? new Date(data.created_at) : undefined,
        data.updated_at ? new Date(data.updated_at) : undefined
      );

      return success(user);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async update(id: string, input: UserUpdateInput): Promise<Result<User, Error>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: input.name,
          plan_type: input.planType,
          plan_status: input.planStatus,
          stripe_customer_id: input.stripeCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return failure(new Error(error.message));
      }

      const user = new User(
        data.id,
        data.email,
        data.name,
        data.plan_type || 'free',
        data.plan_status || 'active',
        data.stripe_customer_id,
        data.created_at ? new Date(data.created_at) : undefined,
        data.updated_at ? new Date(data.updated_at) : undefined
      );

      return success(user);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        return failure(new Error(error.message));
      }

      return success(undefined);
    } catch (error) {
      return failure(error as Error);
    }
  }
}
