import { supabase } from './supabase.client';
import { Plan, PlanCreateInput, PlanUpdateInput } from '@/domain/plan/plan.entity';
import { Result, success, failure } from '@/shared/result';
import { NotFoundError } from '@/shared/errors';

export class PlanRepository {
  async findById(id: string): Promise<Result<Plan, Error>> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return failure(new NotFoundError('Plan not found'));
        }
        return failure(new Error(error.message));
      }

      const plan = new Plan(
        data.id,
        data.name,
        data.description,
        data.features || {},
        data.stripe_price_id,
        data.active
      );

      return success(plan);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async findAll(): Promise<Result<Plan[], Error>> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('id');

      if (error) {
        return failure(new Error(error.message));
      }

      const plans = data.map(item => new Plan(
        item.id,
        item.name,
        item.description,
        item.features || {},
        item.stripe_price_id,
        item.active
      ));

      return success(plans);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async create(input: PlanCreateInput): Promise<Result<Plan, Error>> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .insert({
          id: input.id,
          name: input.name,
          description: input.description,
          features: input.features,
          stripe_price_id: input.stripePriceId,
          active: true,
        })
        .select()
        .single();

      if (error) {
        return failure(new Error(error.message));
      }

      const plan = new Plan(
        data.id,
        data.name,
        data.description,
        data.features || {},
        data.stripe_price_id,
        data.active
      );

      return success(plan);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async update(id: string, input: PlanUpdateInput): Promise<Result<Plan, Error>> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .update({
          name: input.name,
          description: input.description,
          features: input.features,
          stripe_price_id: input.stripePriceId,
          active: input.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return failure(new Error(error.message));
      }

      const plan = new Plan(
        data.id,
        data.name,
        data.description,
        data.features || {},
        data.stripe_price_id,
        data.active
      );

      return success(plan);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async delete(id: string): Promise<Result<void, Error>> {
    try {
      const { error } = await supabase
        .from('plans')
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
