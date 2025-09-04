export class Plan {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly features: Record<string, boolean>,
    public readonly stripePriceId?: string,
    public readonly active: boolean = true
  ) {}

  canUse(feature: string): boolean {
    return this.features[feature] ?? false;
  }

  getFeatureList(): string[] {
    return Object.keys(this.features).filter(key => this.features[key]);
  }
}

export type PlanCreateInput = {
  id: string;
  name: string;
  description: string;
  features: Record<string, boolean>;
  stripePriceId?: string;
};

export type PlanUpdateInput = {
  name?: string;
  description?: string;
  features?: Record<string, boolean>;
  stripePriceId?: string;
  active?: boolean;
};
