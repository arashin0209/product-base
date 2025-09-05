import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
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

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}))

// Import after mocks
const mockDb = await import('@/src/infrastructure/database/connection')
const mockAuth = await import('@/apps/web/lib/auth')
const mockOpenAI = await import('openai')

describe('AI API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/ai/chat', () => {
    it('should process AI request for gold plan user', async () => {
      const userId = 'user-123'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock user with gold plan
      const mockUser = {
        id: userId,
        name: 'Test User',
        planId: 'gold',
        plan: {
          id: 'gold',
          name: 'ゴールドプラン',
          features: {
            aiRequests: { enabled: true, limitValue: 100 }
          }
        }
      }

      // Mock usage check - under limit
      mockDb.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser])
            })
          })
        })
      })

      mockDb.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue([
            { count: 50 } // 50 requests this month, under limit
          ])
        })
      })

      // Mock OpenAI response
      const mockResponse = {
        choices: [{
          message: {
            content: 'Hello! How can I help you today?'
          }
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18
        }
      }

      const openaiInstance = new (mockOpenAI as any).default()
      openaiInstance.chat.completions.create.mockResolvedValue(mockResponse)

      // Mock usage record insertion
      mockDb.db.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([])
      })

      const { POST } = await import('@/apps/web/app/api/ai/chat/route')
      
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Hello, AI!',
          conversation_id: 'conv-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        message: 'Hello! How can I help you today?',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18
        }
      })
    })

    it('should reject request for free plan user', async () => {
      const userId = 'user-123'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock user with free plan
      const mockUser = {
        id: userId,
        name: 'Test User',
        planId: 'free',
        plan: {
          id: 'free',
          name: '無料プラン',
          features: {
            aiRequests: { enabled: false, limitValue: 0 }
          }
        }
      }

      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser])
            })
          })
        })
      })

      const { POST } = await import('@/apps/web/app/api/ai/chat/route')
      
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Hello, AI!',
          conversation_id: 'conv-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FEATURE_NOT_AVAILABLE')
      expect(data.error.message).toContain('AI機能は有料プランでのみ利用可能です')
    })

    it('should reject request when usage limit exceeded', async () => {
      const userId = 'user-123'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock user with gold plan
      const mockUser = {
        id: userId,
        name: 'Test User',
        planId: 'gold',
        plan: {
          id: 'gold',
          name: 'ゴールドプラン',
          features: {
            aiRequests: { enabled: true, limitValue: 100 }
          }
        }
      }

      mockDb.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser])
            })
          })
        })
      })

      // Mock usage check - over limit
      mockDb.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue([
            { count: 100 } // At limit
          ])
        })
      })

      const { POST } = await import('@/apps/web/app/api/ai/chat/route')
      
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Hello, AI!',
          conversation_id: 'conv-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('USAGE_LIMIT_EXCEEDED')
    })

    it('should return validation error for missing message', async () => {
      const userId = 'user-123'
      mockAuth.requireAuth.mockResolvedValue(userId)

      const { POST } = await import('@/apps/web/app/api/ai/chat/route')
      
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // message missing
          conversation_id: 'conv-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/ai/usage', () => {
    it('should return usage statistics for authenticated user', async () => {
      const userId = 'user-123'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock user with plan info
      const mockUser = {
        id: userId,
        planId: 'gold',
        plan: {
          features: {
            aiRequests: { enabled: true, limitValue: 100 }
          }
        }
      }

      mockDb.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser])
            })
          })
        })
      })

      // Mock usage count
      mockDb.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue([
            { count: 75 } // Current month usage
          ])
        })
      })

      const { GET } = await import('@/apps/web/app/api/ai/usage/route')
      
      const request = new NextRequest('http://localhost:3000/api/ai/usage', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer mock-token' }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        current_usage: 75,
        limit: 100,
        remaining: 25
      })
    })
  })
})