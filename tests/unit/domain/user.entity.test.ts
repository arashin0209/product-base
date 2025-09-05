import { describe, it, expect } from 'vitest'

// User entity/value object interfaces (would be in actual domain layer)
interface UserData {
  id: string
  name: string
  email: string
  planId: string
}

interface Plan {
  id: string
  name: string
  features: string[]
}

class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly planId: string = 'free'
  ) {
    this.validateEmail(email)
    this.validateName(name)
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required')
    }
    if (name.length > 100) {
      throw new Error('Name must be less than 100 characters')
    }
  }

  changePlan(newPlanId: string): User {
    if (!newPlanId || !['free', 'gold', 'platinum'].includes(newPlanId)) {
      throw new Error('Invalid plan ID')
    }
    return new User(this.id, this.name, this.email, newPlanId)
  }

  updateName(newName: string): User {
    return new User(this.id, newName, this.email, this.planId)
  }

  isFreePlan(): boolean {
    return this.planId === 'free'
  }

  isPaidPlan(): boolean {
    return ['gold', 'platinum'].includes(this.planId)
  }
}

describe('User Entity', () => {
  describe('constructor', () => {
    it('should create a user with valid data', () => {
      const user = new User('user-id', 'John Doe', 'john@example.com', 'free')
      
      expect(user.id).toBe('user-id')
      expect(user.name).toBe('John Doe')
      expect(user.email).toBe('john@example.com')
      expect(user.planId).toBe('free')
    })

    it('should default to free plan when plan not specified', () => {
      const user = new User('user-id', 'John Doe', 'john@example.com')
      expect(user.planId).toBe('free')
    })

    it('should throw error for invalid email', () => {
      expect(() => new User('user-id', 'John Doe', 'invalid-email', 'free'))
        .toThrow('Invalid email format')
    })

    it('should throw error for empty name', () => {
      expect(() => new User('user-id', '', 'john@example.com', 'free'))
        .toThrow('Name is required')
      
      expect(() => new User('user-id', '   ', 'john@example.com', 'free'))
        .toThrow('Name is required')
    })

    it('should throw error for name too long', () => {
      const longName = 'a'.repeat(101)
      expect(() => new User('user-id', longName, 'john@example.com', 'free'))
        .toThrow('Name must be less than 100 characters')
    })
  })

  describe('changePlan', () => {
    it('should change plan to valid plan ID', () => {
      const user = new User('user-id', 'John Doe', 'john@example.com', 'free')
      const updatedUser = user.changePlan('gold')
      
      expect(updatedUser.planId).toBe('gold')
      expect(updatedUser.id).toBe(user.id) // Other properties unchanged
      expect(updatedUser.name).toBe(user.name)
      expect(updatedUser.email).toBe(user.email)
    })

    it('should throw error for invalid plan ID', () => {
      const user = new User('user-id', 'John Doe', 'john@example.com', 'free')
      
      expect(() => user.changePlan('invalid-plan')).toThrow('Invalid plan ID')
      expect(() => user.changePlan('')).toThrow('Invalid plan ID')
    })
  })

  describe('updateName', () => {
    it('should update name with valid name', () => {
      const user = new User('user-id', 'John Doe', 'john@example.com', 'free')
      const updatedUser = user.updateName('Jane Smith')
      
      expect(updatedUser.name).toBe('Jane Smith')
      expect(updatedUser.id).toBe(user.id)
      expect(updatedUser.email).toBe(user.email)
      expect(updatedUser.planId).toBe(user.planId)
    })

    it('should throw error for invalid name', () => {
      const user = new User('user-id', 'John Doe', 'john@example.com', 'free')
      
      expect(() => user.updateName('')).toThrow('Name is required')
    })
  })

  describe('plan type checks', () => {
    it('should correctly identify free plan', () => {
      const user = new User('user-id', 'John Doe', 'john@example.com', 'free')
      expect(user.isFreePlan()).toBe(true)
      expect(user.isPaidPlan()).toBe(false)
    })

    it('should correctly identify paid plans', () => {
      const goldUser = new User('user-id', 'John Doe', 'john@example.com', 'gold')
      expect(goldUser.isFreePlan()).toBe(false)
      expect(goldUser.isPaidPlan()).toBe(true)

      const platinumUser = new User('user-id', 'John Doe', 'john@example.com', 'platinum')
      expect(platinumUser.isFreePlan()).toBe(false)
      expect(platinumUser.isPaidPlan()).toBe(true)
    })
  })
})