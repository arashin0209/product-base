export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PlanType = 'free' | 'gold' | 'platinum';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';

export type FeatureKey = 
  | 'ai_requests'
  | 'export_csv'
  | 'custom_theme'
  | 'priority_support'
  | 'advanced_analytics';

export type UserSession = {
  id: string;
  email: string;
  name?: string;
  planType: PlanType;
  planStatus: SubscriptionStatus;
  isPremium: boolean;
  features: Record<FeatureKey, boolean>;
};
