import { Subscription } from '../subscription.entity';

describe('Subscription Entity', () => {
  const baseDate = new Date('2025-01-01T00:00:00Z');
  const futureDate = new Date('2025-02-01T00:00:00Z');
  const pastDate = new Date('2024-12-01T00:00:00Z');

  describe('constructor', () => {
    it('should create a subscription with all properties', () => {
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        baseDate,
        futureDate,
        'sub_stripe123',
        'cus_stripe123',
        false,
        undefined,
        baseDate,
        baseDate
      );

      expect(subscription.id).toBe('sub-123');
      expect(subscription.userId).toBe('user-123');
      expect(subscription.planType).toBe('gold');
      expect(subscription.status).toBe('active');
      expect(subscription.currentPeriodStart).toEqual(baseDate);
      expect(subscription.currentPeriodEnd).toEqual(futureDate);
      expect(subscription.stripeSubscriptionId).toBe('sub_stripe123');
      expect(subscription.stripeCustomerId).toBe('cus_stripe123');
      expect(subscription.cancelAtPeriodEnd).toBe(false);
      expect(subscription.canceledAt).toBeUndefined();
      expect(subscription.createdAt).toEqual(baseDate);
      expect(subscription.updatedAt).toEqual(baseDate);
    });

    it('should create a subscription with default values', () => {
      const subscription = new Subscription(
        'sub-456',
        'user-456',
        'free',
        'active',
        baseDate,
        futureDate
      );

      expect(subscription.id).toBe('sub-456');
      expect(subscription.userId).toBe('user-456');
      expect(subscription.planType).toBe('free');
      expect(subscription.status).toBe('active');
      expect(subscription.currentPeriodStart).toEqual(baseDate);
      expect(subscription.currentPeriodEnd).toEqual(futureDate);
      expect(subscription.stripeSubscriptionId).toBeUndefined();
      expect(subscription.stripeCustomerId).toBeUndefined();
      expect(subscription.cancelAtPeriodEnd).toBe(false);
      expect(subscription.canceledAt).toBeUndefined();
      expect(subscription.createdAt).toBeUndefined();
      expect(subscription.updatedAt).toBeUndefined();
    });
  });

  describe('isActive', () => {
    it('should return true for active status', () => {
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        baseDate,
        futureDate
      );

      expect(subscription.isActive).toBe(true);
    });

    it('should return true for trialing status', () => {
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'trialing',
        baseDate,
        futureDate
      );

      expect(subscription.isActive).toBe(true);
    });

    it('should return false for inactive statuses', () => {
      const inactiveStatuses = ['canceled', 'past_due', 'unpaid', 'incomplete'];
      
      inactiveStatuses.forEach(status => {
        const subscription = new Subscription(
          'sub-123',
          'user-123',
          'gold',
          status,
          baseDate,
          futureDate
        );

        expect(subscription.isActive).toBe(false);
      });
    });
  });

  describe('isExpired', () => {
    it('should return true when current period has ended', () => {
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        pastDate,
        pastDate // 過去の日付
      );

      expect(subscription.isExpired).toBe(true);
    });

    it('should return false when current period is still active', () => {
      const futureEndDate = new Date();
      futureEndDate.setDate(futureEndDate.getDate() + 30); // 30日後

      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        baseDate,
        futureEndDate
      );

      expect(subscription.isExpired).toBe(false);
    });
  });

  describe('isCancelled', () => {
    it('should return true when status is canceled', () => {
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'canceled',
        baseDate,
        futureDate
      );

      expect(subscription.isCancelled).toBe(true);
    });

    it('should return true when cancelAtPeriodEnd is true', () => {
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        baseDate,
        futureDate,
        undefined,
        undefined,
        true // cancelAtPeriodEnd = true
      );

      expect(subscription.isCancelled).toBe(true);
    });

    it('should return false when not cancelled', () => {
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        baseDate,
        futureDate,
        undefined,
        undefined,
        false
      );

      expect(subscription.isCancelled).toBe(false);
    });
  });

  describe('isTrialing', () => {
    it('should return true for trialing status', () => {
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'trialing',
        baseDate,
        futureDate
      );

      expect(subscription.isTrialing).toBe(true);
    });

    it('should return false for non-trialing statuses', () => {
      const nonTrialingStatuses = ['active', 'canceled', 'past_due', 'unpaid'];
      
      nonTrialingStatuses.forEach(status => {
        const subscription = new Subscription(
          'sub-123',
          'user-123',
          'gold',
          status,
          baseDate,
          futureDate
        );

        expect(subscription.isTrialing).toBe(false);
      });
    });
  });

  describe('daysUntilExpiry', () => {
    it('should return correct number of days until expiry', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-31T00:00:00Z'); // 30日後
      
      // 現在時刻を固定するためにモック
      const mockNow = new Date('2025-01-15T00:00:00Z'); // 中間の日付
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        startDate,
        endDate
      );

      expect(subscription.daysUntilExpiry).toBe(16); // 31 - 15 = 16日

      // モックをリセット
      jest.restoreAllMocks();
    });

    it('should return 0 when subscription has already expired', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-10T00:00:00Z');
      
      const mockNow = new Date('2025-01-10T00:00:00Z'); // 終了日と同じ
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        startDate,
        endDate
      );

      expect(subscription.daysUntilExpiry).toBe(0);

      // モックをリセット
      jest.restoreAllMocks();
    });

    it('should return negative number when subscription has expired', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-10T00:00:00Z');
      
      const mockNow = new Date('2025-01-20T00:00:00Z'); // 終了日より10日後
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        startDate,
        endDate
      );

      expect(subscription.daysUntilExpiry).toBe(-10);

      // モックをリセット
      jest.restoreAllMocks();
    });
  });

  describe('edge cases', () => {
    it('should handle same start and end dates', () => {
      const sameDate = new Date('2025-01-01T00:00:00Z');
      
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'active',
        sameDate,
        sameDate
      );

      expect(subscription.currentPeriodStart).toEqual(sameDate);
      expect(subscription.currentPeriodEnd).toEqual(sameDate);
    });

    it('should handle canceledAt date', () => {
      const canceledAt = new Date('2025-01-15T00:00:00Z');
      
      const subscription = new Subscription(
        'sub-123',
        'user-123',
        'gold',
        'canceled',
        baseDate,
        futureDate,
        undefined,
        undefined,
        false,
        canceledAt
      );

      expect(subscription.canceledAt).toEqual(canceledAt);
    });
  });
});
