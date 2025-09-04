export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name?: string,
    public readonly planType: string = 'free',
    public readonly planStatus: string = 'active',
    public readonly stripeCustomerId?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  get isPremium(): boolean {
    return this.planType === 'gold' || this.planType === 'platinum';
  }

  get isActive(): boolean {
    return this.planStatus === 'active' || this.planStatus === 'trialing';
  }

  canAccessFeature(feature: string): boolean {
    // 基本的な機能アクセス制御
    if (feature === 'basic') return true;
    if (feature === 'premium') return this.isPremium;
    return false;
  }
}

export type UserCreateInput = {
  email: string;
  name?: string;
  planType?: string;
};

export type UserUpdateInput = {
  name?: string;
  planType?: string;
  planStatus?: string;
  stripeCustomerId?: string;
};
