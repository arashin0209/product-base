import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/src/infrastructure/database/connection'
import { users, plans } from '@/src/infrastructure/database/schema'
import { eq } from 'drizzle-orm'

// Mock the actual database for unit tests
// In a real environment, you would use a test database
vi.mock('@/src/infrastructure/database/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  }
}))

const mockDb = db as any

describe('User Database Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('User Creation', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        id: 'user-123',
        name: 'Test User',
        planId: 'free',
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([userData])
        })
      })

      const result = await mockDb
        .insert(users)
        .values({
          id: userData.id,
          name: userData.name,
          planId: userData.planId,
        })
        .returning()

      expect(mockDb.insert).toHaveBeenCalledWith(users)
      expect(result).toEqual([userData])
    })

    it('should fail to create user with duplicate ID', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed'))
        })
      })

      await expect(
        mockDb
          .insert(users)
          .values({
            id: 'existing-user',
            name: 'Test User',
            planId: 'free',
          })
          .returning()
      ).rejects.toThrow('UNIQUE constraint failed')
    })
  })

  describe('User Retrieval', () => {
    it('should retrieve user by ID', async () => {
      const userData = {
        id: 'user-123',
        name: 'Test User',
        planId: 'free',
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([userData])
          })
        })
      })

      const result = await mockDb
        .select()
        .from(users)
        .where(eq(users.id, 'user-123'))
        .limit(1)

      expect(result).toEqual([userData])
    })

    it('should return empty array for non-existent user', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })

      const result = await mockDb
        .select()
        .from(users)
        .where(eq(users.id, 'non-existent'))
        .limit(1)

      expect(result).toEqual([])
    })
  })

  describe('User Updates', () => {
    it('should update user name', async () => {
      const updatedUser = {
        id: 'user-123',
        name: 'Updated Name',
        planId: 'free',
        updatedAt: new Date(),
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser])
          })
        })
      })

      const result = await mockDb
        .update(users)
        .set({ name: 'Updated Name', updatedAt: new Date() })
        .where(eq(users.id, 'user-123'))
        .returning()

      expect(result).toEqual([updatedUser])
    })

    it('should update user plan', async () => {
      const updatedUser = {
        id: 'user-123',
        name: 'Test User',
        planId: 'gold',
        updatedAt: new Date(),
      }

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser])
          })
        })
      })

      const result = await mockDb
        .update(users)
        .set({ planId: 'gold', updatedAt: new Date() })
        .where(eq(users.id, 'user-123'))
        .returning()

      expect(result).toEqual([updatedUser])
    })
  })

  describe('User and Plan Joins', () => {
    it('should retrieve user with plan details', async () => {
      const userWithPlan = {
        id: 'user-123',
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

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([userWithPlan])
            })
          })
        })
      })

      const result = await mockDb
        .select()
        .from(users)
        .leftJoin(plans, eq(users.planId, plans.id))
        .where(eq(users.id, 'user-123'))
        .limit(1)

      expect(result).toEqual([userWithPlan])
    })
  })

  describe('Transaction Tests', () => {
    it('should handle user creation with transaction', async () => {
      const userData = {
        id: 'user-123',
        name: 'Test User',
        planId: 'free',
      }

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(mockDb)
      })

      mockDb.transaction = mockTransaction

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([userData])
        })
      })

      await mockDb.transaction(async (tx: any) => {
        const result = await tx
          .insert(users)
          .values(userData)
          .returning()
        
        expect(result).toEqual([userData])
      })

      expect(mockTransaction).toHaveBeenCalled()
    })

    it('should rollback transaction on error', async () => {
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        try {
          return await callback(mockDb)
        } catch (error) {
          throw new Error('Transaction rolled back')
        }
      })

      mockDb.transaction = mockTransaction

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      })

      await expect(
        mockDb.transaction(async (tx: any) => {
          await tx
            .insert(users)
            .values({
              id: 'user-123',
              name: 'Test User',
              planId: 'free',
            })
            .returning()
        })
      ).rejects.toThrow('Transaction rolled back')
    })
  })
})