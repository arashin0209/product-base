import { User } from '../user.entity';

describe('User Entity', () => {
  describe('constructor', () => {
    it('should create a user with all properties', () => {
      const user = new User(
        'user-123',
        'test@example.com',
        'Test User',
        'gold',
        'active',
        'cus_123',
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-01-01T12:00:00Z')
      );

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.planType).toBe('gold');
      expect(user.planStatus).toBe('active');
      expect(user.stripeCustomerId).toBe('cus_123');
      expect(user.createdAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      expect(user.updatedAt).toEqual(new Date('2025-01-01T12:00:00Z'));
    });

    it('should create a user with default values', () => {
      const user = new User('user-123', 'test@example.com');

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBeUndefined();
      expect(user.planType).toBe('free');
      expect(user.planStatus).toBe('active');
      expect(user.stripeCustomerId).toBeUndefined();
      expect(user.createdAt).toBeUndefined();
      expect(user.updatedAt).toBeUndefined();
    });
  });

  describe('isPremium', () => {
    it('should return true for gold plan', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'gold');
      expect(user.isPremium).toBe(true);
    });

    it('should return true for platinum plan', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'platinum');
      expect(user.isPremium).toBe(true);
    });

    it('should return false for free plan', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'free');
      expect(user.isPremium).toBe(false);
    });

    it('should return false for unknown plan', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'unknown');
      expect(user.isPremium).toBe(false);
    });
  });

  describe('isActive', () => {
    it('should return true for active status', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'free', 'active');
      expect(user.isActive).toBe(true);
    });

    it('should return true for trialing status', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'free', 'trialing');
      expect(user.isActive).toBe(true);
    });

    it('should return false for inactive status', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'free', 'inactive');
      expect(user.isActive).toBe(false);
    });

    it('should return false for canceled status', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'free', 'canceled');
      expect(user.isActive).toBe(false);
    });
  });

  describe('canAccessFeature', () => {
    it('should allow basic features for all users', () => {
      const freeUser = new User('user-123', 'test@example.com', 'Test User', 'free');
      const goldUser = new User('user-456', 'test@example.com', 'Test User', 'gold');

      expect(freeUser.canAccessFeature('basic')).toBe(true);
      expect(goldUser.canAccessFeature('basic')).toBe(true);
    });

    it('should allow premium features only for premium users', () => {
      const freeUser = new User('user-123', 'test@example.com', 'Test User', 'free');
      const goldUser = new User('user-456', 'test@example.com', 'Test User', 'gold');
      const platinumUser = new User('user-789', 'test@example.com', 'Test User', 'platinum');

      expect(freeUser.canAccessFeature('premium')).toBe(false);
      expect(goldUser.canAccessFeature('premium')).toBe(true);
      expect(platinumUser.canAccessFeature('premium')).toBe(true);
    });

    it('should return false for unknown features', () => {
      const user = new User('user-123', 'test@example.com', 'Test User', 'gold');
      expect(user.canAccessFeature('unknown')).toBe(false);
    });
  });
});
