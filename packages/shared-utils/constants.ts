export const PLAN_FEATURES = {
  free: {
    ai_requests: false,
    export_csv: false,
    custom_theme: false,
    priority_support: false,
    advanced_analytics: false,
  },
  gold: {
    ai_requests: true,
    export_csv: true,
    custom_theme: false,
    priority_support: false,
    advanced_analytics: false,
  },
  platinum: {
    ai_requests: true,
    export_csv: true,
    custom_theme: true,
    priority_support: true,
    advanced_analytics: true,
  },
} as const;

export const PLAN_LIMITS = {
  free: {
    max_requests_per_month: 0,
    max_exports_per_month: 0,
  },
  gold: {
    max_requests_per_month: 100,
    max_exports_per_month: 10,
  },
  platinum: {
    max_requests_per_month: -1, // unlimited
    max_exports_per_month: -1, // unlimited
  },
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    LOGOUT: '/api/auth/logout',
    ME: '/api/users/me',
  },
  BILLING: {
    CHECKOUT: '/api/billing/checkout',
    PORTAL: '/api/billing/portal',
    WEBHOOK: '/api/billing/webhook',
  },
  PLANS: '/api/plans',
} as const;
