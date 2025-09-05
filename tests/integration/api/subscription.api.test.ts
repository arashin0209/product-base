import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the database and dependencies
vi.mock('@/src/infrastructure/database/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  }
}))

vi.mock('@/apps/web/lib/auth', () => ({
  requireAuth: vi.fn()
}))

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    billingPortal: {
      sessions: {
        create: vi.fn()
      }
    }
  }))
}))

// Import after mocks
const mockDb = await import('@/src/infrastructure/database/connection')
const mockAuth = await import('@/apps/web/lib/auth')
const mockStripe = await import('stripe')

describe('Subscription API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/subscription/status', () => {
    it('should return subscription status for authenticated user', async () => {
      const userId = 'user-123'
      
      // Mock auth
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock user with subscription
      const mockUser = {
        id: userId,
        name: 'Test User',
        planId: 'gold',
        stripeCustomerId: 'cus_test123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockPlan = {
        id: 'gold',
        name: 'ゴールドプラン',
        features: {
          aiRequests: { enabled: true, limitValue: 100 },
          prioritySupport: { enabled: true },
          advancedAnalytics: { enabled: true },
        }
      }

      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                ...mockUser,
                plan: mockPlan
              }])
            })
          })
        })
      })

      const { GET } = await import('@/apps/web/app/api/subscription/status/route')
      
      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer mock-token' }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        plan_id: 'gold',
        plan_name: 'ゴールドプラン',
        status: 'active',
        features: {
          ai_requests: { enabled: true, limit_value: 100 }
        }
      })
    })

    it('should return free plan for user without subscription', async () => {
      const userId = 'user-123'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      const mockUser = {
        id: userId,
        name: 'Test User',
        planId: 'free',
        stripeCustomerId: null,
      }

      const mockFreePlan = {
        id: 'free',
        name: '無料プラン',
        features: {
          aiRequests: { enabled: false, limitValue: 0 },
        }
      }

      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                ...mockUser,
                plan: mockFreePlan
              }])
            })
          })
        })
      })

      const { GET } = await import('@/apps/web/app/api/subscription/status/route')
      
      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer mock-token' }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        plan_id: 'free',
        plan_name: '無料プラン',
        status: 'free',
        features: {
          ai_requests: { enabled: false, limit_value: 0 }
        }
      })
    })

    it('should return 401 for unauthenticated user', async () => {
      mockAuth.requireAuth.mockRejectedValue({
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
        statusCode: 401
      })

      const { GET } = await import('@/apps/web/app/api/subscription/status/route')
      
      const request = new NextRequest('http://localhost:3000/api/subscription/status', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('POST /api/billing/portal', () => {
    it('should create billing portal session for customer with stripe ID', async () => {
      const userId = 'user-123'
      const stripeCustomerId = 'cus_test123'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock user with Stripe customer ID
      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: userId,
              stripeCustomerId: stripeCustomerId
            }])
          })
        })
      })

      // Mock Stripe billing portal session
      const mockSession = {
        url: 'https://billing.stripe.com/session/test123'
      }

      const stripeInstance = new (mockStripe as any).default()
      stripeInstance.billingPortal.sessions.create.mockResolvedValue(mockSession)

      const { POST } = await import('@/apps/web/app/api/billing/portal/route')
      
      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          returnUrl: 'http://localhost:3000/dashboard'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.url).toBe('https://billing.stripe.com/session/test123')
    })

    it('should return error for user without stripe customer ID', async () => {
      const userId = 'user-123'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock user without Stripe customer ID
      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: userId,
              stripeCustomerId: null
            }])
          })
        })
      })

      const { POST } = await import('@/apps/web/app/api/billing/portal/route')
      
      const request = new NextRequest('http://localhost:3000/api/billing/portal', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          returnUrl: 'http://localhost:3000/dashboard'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NO_SUBSCRIPTION')
    })
  })
})