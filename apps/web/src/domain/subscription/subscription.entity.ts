export class Subscription {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly planType: string,
    public readonly status: string,
    public readonly currentPeriodStart: Date,
    public readonly currentPeriodEnd: Date,
    public readonly stripeSubscriptionId?: string,
    public readonly stripeCustomerId?: string,
    public readonly cancelAtPeriodEnd: boolean = false,
    public readonly canceledAt?: Date,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  get isActive(): boolean {
    return this.status === 'active' || this.status === 'trialing';
  }

  get isExpired(): boolean {
    return new Date() > this.currentPeriodEnd;
  }

  get isCancelled(): boolean {
    return this.status === 'canceled' || this.cancelAtPeriodEnd;
  }

  get isTrialing(): boolean {
    return this.status === 'trialing';
  }

  get daysUntilExpiry(): number {
    const now = new Date();
    const diffTime = this.currentPeriodEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export type SubscriptionCreateInput = {
  userId: string;
  planType: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd?: boolean;
};

export type SubscriptionUpdateInput = {
  planType?: string;
  status?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
};
