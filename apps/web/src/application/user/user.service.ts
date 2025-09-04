import { User, UserCreateInput, UserUpdateInput } from '@/domain/user/user.entity';
import { UserRepository } from '@/infrastructure/supabase/user.repository';
import { Result, success, failure } from '@/shared/result';
import { AuthenticationError, NotFoundError } from '@/shared/errors';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getCurrentUser(userId: string): Promise<Result<User, Error>> {
    const result = await this.userRepository.findById(userId);
    if (!result.success) {
      return failure(new AuthenticationError('User not found'));
    }
    return success(result.data);
  }

  async getUserByEmail(email: string): Promise<Result<User, Error>> {
    return await this.userRepository.findByEmail(email);
  }

  async createUser(input: UserCreateInput): Promise<Result<User, Error>> {
    return await this.userRepository.create(input);
  }

  async updateUser(userId: string, input: UserUpdateInput): Promise<Result<User, Error>> {
    const result = await this.userRepository.update(userId, input);
    if (!result.success) {
      return failure(new NotFoundError('User not found'));
    }
    return success(result.data);
  }

  async deleteUser(userId: string): Promise<Result<void, Error>> {
    return await this.userRepository.delete(userId);
  }

  async updateUserPlan(userId: string, planType: string, planStatus: string): Promise<Result<User, Error>> {
    return await this.updateUser(userId, {
      planType,
      planStatus,
    });
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<Result<User, Error>> {
    return await this.updateUser(userId, {
      stripeCustomerId,
    });
  }
}
