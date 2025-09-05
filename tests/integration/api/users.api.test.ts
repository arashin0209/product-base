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

// Import after mocks
const mockDb = await import('@/src/infrastructure/database/connection')
const mockAuth = await import('@/apps/web/lib/auth')

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/users', () => {
    it('should create user with valid data', async () => {
      // Mock database response
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        planId: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No existing user
          })
        })
      })

      mockDb.db.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser])
        })
      })

      // Import the API handler after mocking
      const { POST } = await import('@/apps/web/app/api/users/route')
      
      // Create request with valid data
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          planType: 'free'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        planType: 'free'
      })
    })

    it('should return validation error for missing userId', async () => {
      const { POST } = await import('@/apps/web/app/api/users/route')
      
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // userId missing - this should trigger validation error
          email: 'test@example.com',
          name: 'Test User'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return error for duplicate user', async () => {
      // Mock existing user
      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'user-123' }]) // Existing user
          })
        })
      })

      const { POST } = await import('@/apps/web/app/api/users/route')
      
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('USER_EXISTS')
    })
  })

  describe('GET /api/users/me', () => {
    it('should return user data for authenticated user', async () => {
      const userId = 'user-123'
      
      // Mock auth
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock database response
      const mockUser = {
        id: userId,
        name: 'Test User',
        planId: 'free',
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser])
          })
        })
      })

      const { GET } = await import('@/apps/web/app/api/users/me/route')
      
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer mock-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        id: userId,
        name: 'Test User',
        plan_id: 'free'
      })
    })

    it('should return 404 for non-existent user', async () => {
      const userId = 'non-existent-user'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      // Mock no user found
      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No user found
          })
        })
      })

      const { GET } = await import('@/apps/web/app/api/users/me/route')
      
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer mock-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should return 401 for unauthenticated request', async () => {
      mockAuth.requireAuth.mockRejectedValue({
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
        statusCode: 401
      })

      const { GET } = await import('@/apps/web/app/api/users/me/route')
      
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'GET'
        // No Authorization header
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('PUT /api/users/me', () => {
    it('should update user name', async () => {
      const userId = 'user-123'
      
      mockAuth.requireAuth.mockResolvedValue(userId)
      
      const updatedUser = {
        id: userId,
        name: 'Updated Name',
        updatedAt: new Date(),
      }

      mockDb.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser])
          })
        })
      })

      const { PUT } = await import('@/apps/web/app/api/users/me/route')
      
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Updated Name'
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('Updated Name')
    })

    it('should return validation error for empty name', async () => {
      const userId = 'user-123'
      mockAuth.requireAuth.mockResolvedValue(userId)

      const { PUT } = await import('@/apps/web/app/api/users/me/route')
      
      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'PUT',
        headers: { 
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: '' // Empty name should fail validation
        })
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})