import { Plan } from '@/domain/plan/plan.entity';
import { PlanRepository } from '@/infrastructure/supabase/plan.repository';
import { Result, success, failure } from '@/shared/result';
import { NotFoundError } from '@/shared/errors';

export class PlanService {
  constructor(private planRepository: PlanRepository) {}

  async getAllPlans(): Promise<Result<Plan[], Error>> {
    return await this.planRepository.findAll();
  }

  async getPlanById(id: string): Promise<Result<Plan, Error>> {
    const result = await this.planRepository.findById(id);
    if (!result.success) {
      return failure(new NotFoundError('Plan not found'));
    }
    return success(result.data);
  }

  async getUserPlan(userId: string, userPlanType: string): Promise<Result<Plan, Error>> {
    const result = await this.planRepository.findById(userPlanType);
    if (!result.success) {
      // フォールバック: freeプランを返す
      const freePlanResult = await this.planRepository.findById('free');
      if (!freePlanResult.success) {
        return failure(new Error('Default plan not found'));
      }
      return success(freePlanResult.data);
    }
    return success(result.data);
  }

  async canUserAccessFeature(userId: string, userPlanType: string, feature: string): Promise<Result<boolean, Error>> {
    const planResult = await this.getUserPlan(userId, userPlanType);
    if (!planResult.success) {
      return failure(planResult.error);
    }

    const canAccess = planResult.data.canUse(feature);
    return success(canAccess);
  }
}
